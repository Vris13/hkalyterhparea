-- Add RSVP table for event responses
CREATE TABLE event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  response TEXT NOT NULL CHECK (response IN ('Ναι', 'Όχι', 'Μπορεί', 'Θα αργήσω')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, person_id)
);

-- Add RLS policies
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on event_rsvps" ON event_rsvps
  FOR ALL USING (true) WITH CHECK (true);

-- Add index for faster queries
CREATE INDEX idx_event_rsvps_event_id ON event_rsvps(event_id);
CREATE INDEX idx_event_rsvps_person_id ON event_rsvps(person_id);
