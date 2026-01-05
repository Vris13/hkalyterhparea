-- Add RSVP table for event responses
CREATE TABLE event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  custom_name TEXT,
  response TEXT NOT NULL CHECK (response IN ('Ναι', 'Όχι', 'Μπορεί', 'Θα αργήσω')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK ((person_id IS NOT NULL) OR (custom_name IS NOT NULL))
);

-- Add RLS policies
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on event_rsvps" ON event_rsvps
  FOR ALL USING (true) WITH CHECK (true);

-- Add index for faster queries
CREATE INDEX idx_event_rsvps_event_id ON event_rsvps(event_id);
CREATE INDEX idx_event_rsvps_person_id ON event_rsvps(person_id);

-- If table already exists, add the custom_name column:
-- ALTER TABLE event_rsvps ADD COLUMN IF NOT EXISTS custom_name TEXT;
-- ALTER TABLE event_rsvps ALTER COLUMN person_id DROP NOT NULL;
-- ALTER TABLE event_rsvps DROP CONSTRAINT IF EXISTS event_rsvps_event_id_person_id_key;
-- ALTER TABLE event_rsvps ADD CONSTRAINT check_person_or_custom CHECK ((person_id IS NOT NULL) OR (custom_name IS NOT NULL));
