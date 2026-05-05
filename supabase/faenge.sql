-- Tabelle: faenge
-- Führe dieses Script im Supabase SQL Editor aus.

CREATE TABLE IF NOT EXISTS faenge (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fischart    text        NOT NULL,
  laenge      numeric(6,1),          -- in cm
  gewicht     numeric(8,1),          -- in g
  datum       date        NOT NULL DEFAULT CURRENT_DATE,
  gewaesser   text,
  bemerkung   text,
  created_at  timestamptz DEFAULT now()
);

-- Row Level Security aktivieren
ALTER TABLE faenge ENABLE ROW LEVEL SECURITY;

-- Alle eingeloggten Mitglieder können alle Fänge lesen
CREATE POLICY "members_select" ON faenge
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Mitglieder können nur eigene Fänge eintragen
CREATE POLICY "members_insert" ON faenge
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Mitglieder können nur eigene Fänge bearbeiten
CREATE POLICY "members_update_own" ON faenge
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Mitglieder können nur eigene Fänge löschen
CREATE POLICY "members_delete_own" ON faenge
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admin/Moderator-Funktion zum Löschen beliebiger Einträge (umgeht RLS)
CREATE OR REPLACE FUNCTION admin_delete_fang(fang_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM faenge WHERE id = fang_id;
$$;
