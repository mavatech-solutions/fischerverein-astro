# Supabase Benutzername-Setup

Diese Datei erklärt, wie du Supabase für die neue Benutzername-Funktionalität konfigurierst.

## Schritt 1: `username` Spalte zur `profiles` Tabelle hinzufügen

Gehe zu deinem Supabase-Projekt und führe folgende SQL aus (unter "SQL Editor"):

```sql
ALTER TABLE profiles ADD COLUMN username TEXT UNIQUE;
```

Optional: Wenn du einen Index für schnellere Suchen haben möchtest:

```sql
CREATE INDEX idx_profiles_username ON profiles(username);
```

## Schritt 2: `create_or_update_profile` RPC-Funktion aktualisieren

Falls du bereits eine RPC-Funktion hast, aktualisiere sie so, dass sie den `username` Parameter akzeptiert und speichert:

```sql
CREATE OR REPLACE FUNCTION create_or_update_profile(
  target_id UUID,
  target_email TEXT,
  target_name TEXT,
  target_username TEXT,
  target_role TEXT DEFAULT 'user'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, username, role, created_at)
  VALUES (target_id, target_email, target_name, target_username, target_role, NOW())
  ON CONFLICT (id) DO UPDATE
  SET email = target_email,
      full_name = target_name,
      username = target_username,
      role = target_role;
END;
$$;
```

Falls du noch keine RPC-Funktion hast, erstelle sie mit dem obigen Code.

## Schritt 3: Row Level Security (RLS) für `profiles` überprüfen

Stelle sicher, dass die `profiles` Tabelle erlaubt, dass angemeldete Benutzer ihre eigenen Profile lesen können. Die RLS-Policy sollte etwa so aussehen:

```sql
CREATE POLICY "Users can select their own profile" ON profiles
FOR SELECT
USING (auth.uid() = id);
```

## Schritt 4: RPC für Username-Login erstellen (wichtig)

Da beim Login noch keine Session existiert, blockiert RLS den direkten Zugriff auf `profiles`.
Deshalb braucht der Login eine `SECURITY DEFINER` Funktion, die aus einem Benutzernamen die E-Mail auflöst:

```sql
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email
  FROM public.profiles
  WHERE lower(username) = lower(trim(p_username))
  LIMIT 1;

  RETURN v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.get_email_by_username(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon, authenticated;
```

Testen:

```sql
SELECT public.get_email_by_username('mario.st');
```

Wenn hier `NULL` zurückkommt, hat der User noch keinen `username` in `profiles`.

## Fertig!

Nach diesen Schritten funktioniert die neue Benutzername-Funktionalität:
- ✅ Benutzer können sich mit Benutzername einloggen
- ✅ Der Benutzername wird im Admin-Panel angezeigt
- ✅ Der Benutzername wird in Supabase gespeichert
