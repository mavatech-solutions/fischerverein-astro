-- ============================================================
-- Aktuelles (Newsfeed) für Mitglieder
-- ============================================================

-- ============================================================
-- Storage: Bucket + Policies
-- ============================================================

-- Bucket erstellen (privat)
INSERT INTO storage.buckets (id, name, public)
VALUES ('aktuelles', 'aktuelles', false)
ON CONFLICT (id) DO NOTHING;

-- Mitglieder dürfen Dateien herunterladen
DROP POLICY IF EXISTS "Members read aktuelles storage" ON storage.objects;
CREATE POLICY "Members read aktuelles storage" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'aktuelles');

-- Admins/Moderatoren dürfen hochladen
DROP POLICY IF EXISTS "Admin moderator upload aktuelles" ON storage.objects;
CREATE POLICY "Admin moderator upload aktuelles" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'aktuelles' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- Admins/Moderatoren dürfen löschen
DROP POLICY IF EXISTS "Admin moderator delete aktuelles" ON storage.objects;
CREATE POLICY "Admin moderator delete aktuelles" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'aktuelles' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- Tabelle: Newsfeed-Beiträge
CREATE TABLE IF NOT EXISTS aktuelles (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  titel       text        NOT NULL,
  inhalt      text        NOT NULL DEFAULT '',
  autor_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  autor_name  text        NOT NULL DEFAULT '',
  pinned      boolean     NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE aktuelles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read aktuelles" ON aktuelles;
CREATE POLICY "Members read aktuelles" ON aktuelles
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin moderator manage aktuelles" ON aktuelles;
CREATE POLICY "Admin moderator manage aktuelles" ON aktuelles
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON aktuelles TO authenticated;

-- Auto-Update updated_at
CREATE OR REPLACE FUNCTION update_aktuelles_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_aktuelles_updated_at ON aktuelles;
CREATE TRIGGER trg_aktuelles_updated_at
  BEFORE UPDATE ON aktuelles
  FOR EACH ROW EXECUTE FUNCTION update_aktuelles_updated_at();

-- ============================================================
-- Tabelle: Anhänge zu Beiträgen
-- ============================================================
CREATE TABLE IF NOT EXISTS aktuelles_anhaenge (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     uuid        NOT NULL REFERENCES aktuelles(id) ON DELETE CASCADE,
  dateiname   text        NOT NULL,
  pfad        text        NOT NULL,
  groesse     bigint,
  mime_typ    text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE aktuelles_anhaenge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read anhaenge" ON aktuelles_anhaenge;
CREATE POLICY "Members read anhaenge" ON aktuelles_anhaenge
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin moderator manage anhaenge" ON aktuelles_anhaenge;
CREATE POLICY "Admin moderator manage anhaenge" ON aktuelles_anhaenge
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON aktuelles_anhaenge TO authenticated;
