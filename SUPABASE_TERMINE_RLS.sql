-- RLS für die termine Tabelle
-- Im Supabase SQL-Editor ausführen

ALTER TABLE termine ENABLE ROW LEVEL SECURITY;

-- Alle eingeloggten Mitglieder dürfen Termine lesen
CREATE POLICY "Authenticated read termine" ON termine
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admin und Moderator dürfen Termine erstellen
CREATE POLICY "Admin moderator insert termine" ON termine
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Admin und Moderator dürfen Termine bearbeiten
CREATE POLICY "Admin moderator update termine" ON termine
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Admin und Moderator dürfen Termine löschen
CREATE POLICY "Admin moderator delete termine" ON termine
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Tabellenrechte
GRANT SELECT ON termine TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON termine TO authenticated;
