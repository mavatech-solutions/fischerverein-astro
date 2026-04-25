-- Galerie Tabelle
CREATE TABLE galerie_bilder (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  album text NOT NULL,
  src text NOT NULL,
  thumb text,
  caption text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE galerie_bilder ENABLE ROW LEVEL SECURITY;

-- Öffentlich lesbar (Galerie ist öffentlich)
CREATE POLICY "Public read galerie" ON galerie_bilder
  FOR SELECT USING (true);

-- Admin und Moderator dürfen verwalten
CREATE POLICY "Admin moderator manage galerie" ON galerie_bilder
  FOR ALL
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

-- Tabellenrechte für Supabase-Rollen
GRANT SELECT ON galerie_bilder TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON galerie_bilder TO authenticated;
