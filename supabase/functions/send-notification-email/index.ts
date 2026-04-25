// Supabase Edge Function: send-notification-email
// Benötigte Supabase Secrets (einmalig setzen):
//   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
//   supabase secrets set FROM_EMAIL=info@deine-domain.de
//
// Domain bei Resend verifizieren: https://resend.com/domains
// Deployen: supabase functions deploy send-notification-email

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const RESEND_KEY = Deno.env.get('RESEND_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const FROM = Deno.env.get('FROM_EMAIL') || 'noreply@example.com'

    if (!RESEND_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY nicht konfiguriert' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const body = await req.json()
    const { type } = body

    if (!type) {
      return new Response(
        JSON.stringify({ error: 'type ist erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Kontaktformular → nur an Vereins-E-Mail senden ──────────────────────
    if (type === 'kontakt') {
      const { vorname, nachname, email: senderEmail, telefon, betreff, nachricht } = body

      if (!vorname || !senderEmail || !nachricht || !betreff) {
        return new Response(
          JSON.stringify({ error: 'Pflichtfelder fehlen' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const betreffLabels: Record<string, string> = {
        mitgliedschaft: 'Mitgliedschaft',
        angelschein: 'Angelschein / Erlaubnis',
        veranstaltung: 'Veranstaltung',
        sonstiges: 'Sonstiges',
      }
      const betreffLabel = betreffLabels[betreff] || betreff
      const subject = `Kontaktanfrage: ${betreffLabel} – ${vorname} ${nachname || ''}`.trim()
      const html = buildKontaktHtml(vorname, nachname, senderEmail, telefon, betreffLabel, nachricht)

      // E-Mail an den Verein
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `Fischerverein Oberstenfeld Gronau e.V <${FROM}>`,
          to: FROM,
          reply_to: senderEmail,
          subject,
          html,
        }),
      })

      if (!emailRes.ok) {
        const errText = await emailRes.text()
        throw new Error('Resend Fehler: ' + errText)
      }

      // Bestätigungs-E-Mail an den Absender
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `Fischerverein Oberstenfeld Gronau e.V <${FROM}>`,
          to: senderEmail,
          subject: 'Deine Nachricht ist bei uns angekommen',
          html: buildBestaetigungHtml(vorname),
        }),
      })

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Termin / Beitrag → an alle Mitglieder senden ────────────────────────
    const { titel, datum, uhrzeit, ort, beschreibung, inhalt, autor_name } = body

    if (!titel) {
      return new Response(
        JSON.stringify({ error: 'titel ist erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const profilesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=email&email=not.is.null`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    )

    if (!profilesRes.ok) {
      throw new Error('Mitgliederliste konnte nicht geladen werden: ' + profilesRes.status)
    }

    const profiles = await profilesRes.json()
    const bccList: string[] = profiles
      .map((p: { email: string }) => p.email)
      .filter(Boolean)

    if (!bccList.length) {
      return new Response(
        JSON.stringify({ sent: 0, note: 'Keine E-Mail-Adressen gefunden' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const subject =
      type === 'termin'
        ? `Neuer Termin: ${titel}`
        : `Neues im Aktuelles: ${titel}`

    const html =
      type === 'termin'
        ? buildTerminHtml(titel, datum, uhrzeit, ort, beschreibung)
        : buildBeitragHtml(titel, inhalt, autor_name)

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Fischerverein Oberstenfeld Gronau e.V <${FROM}>`,
        to: FROM,
        bcc: bccList,
        subject,
        html,
      }),
    })

    if (!emailRes.ok) {
      const errText = await emailRes.text()
      throw new Error('Resend Fehler: ' + errText)
    }

    return new Response(JSON.stringify({ sent: bccList.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function esc(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildBestaetigungHtml(vorname: string) {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#2d7a72;padding:24px 32px">
      <p style="margin:0;color:rgba(255,255,255,.75);font-size:12px;letter-spacing:.6px;text-transform:uppercase">Fischerverein Oberstenfeld Gronau e.V</p>
      <h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:700">Nachricht erhalten!</h1>
    </div>
    <div style="padding:32px">
      <p style="font-size:16px;color:#1a1a1a;margin:0 0 12px">Hallo ${esc(vorname)},</p>
      <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 16px">
        vielen Dank für deine Nachricht! Wir haben deine Anfrage erhalten und werden uns so schnell wie möglich bei dir melden.
      </p>
      <p style="font-size:14px;color:#555;line-height:1.7;margin:0">
        Mit freundlichen Grüßen<br>
        <strong style="color:#1a1a1a">Fischerverein Oberstenfeld Gronau e.V</strong>
      </p>
    </div>
    <div style="padding:14px 32px;background:#f9f9f9;border-top:1px solid #eee">
      <p style="margin:0;font-size:12px;color:#aaa">Bitte antworte nicht auf diese E-Mail. Bei Fragen nutze das Kontaktformular auf unserer Website.</p>
    </div>
  </div>
</body>
</html>`
}

function buildKontaktHtml(
  vorname: string,
  nachname: string | null,
  email: string,
  telefon: string | null,
  betreff: string,
  nachricht: string
) {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#2d7a72;padding:24px 32px">
      <p style="margin:0;color:rgba(255,255,255,.75);font-size:12px;letter-spacing:.6px;text-transform:uppercase">Fischerverein</p>
      <h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:700">Neue Kontaktanfrage</h1>
    </div>
    <div style="padding:32px">
      <table style="border-collapse:collapse;width:100%;margin-bottom:24px">
        <tr><td style="padding:7px 16px 7px 0;color:#666;font-size:14px;white-space:nowrap;vertical-align:top">Name</td><td style="padding:7px 0;font-size:14px;font-weight:600;color:#1a1a1a">${esc(vorname)} ${esc(nachname || '')}</td></tr>
        <tr><td style="padding:7px 16px 7px 0;color:#666;font-size:14px;white-space:nowrap">E-Mail</td><td style="padding:7px 0;font-size:14px;color:#1a1a1a"><a href="mailto:${esc(email)}" style="color:#2d7a72">${esc(email)}</a></td></tr>
        ${telefon ? `<tr><td style="padding:7px 16px 7px 0;color:#666;font-size:14px;white-space:nowrap">Telefon</td><td style="padding:7px 0;font-size:14px;color:#1a1a1a">${esc(telefon)}</td></tr>` : ''}
        <tr><td style="padding:7px 16px 7px 0;color:#666;font-size:14px;white-space:nowrap">Betreff</td><td style="padding:7px 0;font-size:14px;color:#1a1a1a"><span style="background:#f0f7f6;color:#2d7a72;padding:2px 10px;border-radius:20px;font-size:13px">${esc(betreff)}</span></td></tr>
      </table>
      <div style="background:#f9f9f9;border-left:3px solid #2d7a72;padding:14px 16px;border-radius:0 8px 8px 0;font-size:14px;color:#555;line-height:1.7;white-space:pre-line">${esc(nachricht)}</div>
      <p style="margin:20px 0 0;font-size:13px;color:#999">Antworte direkt auf diese E-Mail, um ${esc(vorname)} zu kontaktieren.</p>
    </div>
    <div style="padding:14px 32px;background:#f9f9f9;border-top:1px solid #eee">
      <p style="margin:0;font-size:12px;color:#aaa">Gesendet über das Kontaktformular auf der Website.</p>
    </div>
  </div>
</body>
</html>`
}

function buildTerminHtml(
  titel: string,
  datum: string | null,
  uhrzeit: string | null,
  ort: string | null,
  beschreibung: string | null
) {
  const datumStr = datum
    ? new Date(datum + 'T00:00:00').toLocaleDateString('de-DE', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : ''

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#2d7a72;padding:24px 32px">
      <p style="margin:0;color:rgba(255,255,255,.75);font-size:12px;letter-spacing:.6px;text-transform:uppercase">Fischerverein</p>
      <h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:700">Neuer Termin</h1>
    </div>
    <div style="padding:32px">
      <h2 style="margin:0 0 20px;font-size:20px;color:#1a1a1a">${esc(titel)}</h2>
      <table style="border-collapse:collapse;width:100%;margin-bottom:20px">
        ${datumStr ? `<tr><td style="padding:8px 16px 8px 0;color:#666;font-size:14px;white-space:nowrap;vertical-align:top">Datum</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#1a1a1a">${datumStr}</td></tr>` : ''}
        ${uhrzeit ? `<tr><td style="padding:8px 16px 8px 0;color:#666;font-size:14px;white-space:nowrap">Uhrzeit</td><td style="padding:8px 0;font-size:14px;color:#1a1a1a">${esc(uhrzeit)} Uhr</td></tr>` : ''}
        ${ort ? `<tr><td style="padding:8px 16px 8px 0;color:#666;font-size:14px;white-space:nowrap">Ort</td><td style="padding:8px 0;font-size:14px;color:#1a1a1a">${esc(ort)}</td></tr>` : ''}
      </table>
      ${beschreibung ? `<div style="background:#f0f7f6;border-left:3px solid #2d7a72;padding:12px 16px;border-radius:0 8px 8px 0;font-size:14px;color:#555;line-height:1.6">${esc(beschreibung).replace(/\n/g, '<br>')}</div>` : ''}
    </div>
    <div style="padding:14px 32px;background:#f9f9f9;border-top:1px solid #eee">
      <p style="margin:0;font-size:12px;color:#aaa">Diese E-Mail wurde automatisch vom Mitgliederbereich gesendet.</p>
    </div>
  </div>
</body>
</html>`
}

function buildBeitragHtml(titel: string, inhalt: string | null, autor: string | null) {
  const preview =
    inhalt && inhalt.length > 400 ? inhalt.slice(0, 400) + '…' : inhalt || ''

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#2d7a72;padding:24px 32px">
      <p style="margin:0;color:rgba(255,255,255,.75);font-size:12px;letter-spacing:.6px;text-transform:uppercase">Fischerverein</p>
      <h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:700">Neues im Aktuelles</h1>
    </div>
    <div style="padding:32px">
      <h2 style="margin:0 0 6px;font-size:20px;color:#1a1a1a">${esc(titel)}</h2>
      ${autor ? `<p style="margin:0 0 20px;font-size:13px;color:#999">von ${esc(autor)}</p>` : '<div style="margin-bottom:20px"></div>'}
      <div style="font-size:14px;color:#555;line-height:1.75;white-space:pre-line">${esc(preview)}</div>
    </div>
    <div style="padding:14px 32px;background:#f9f9f9;border-top:1px solid #eee">
      <p style="margin:0;font-size:12px;color:#aaa">Diese E-Mail wurde automatisch vom Mitgliederbereich gesendet.</p>
    </div>
  </div>
</body>
</html>`
}
