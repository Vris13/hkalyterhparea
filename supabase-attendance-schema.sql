-- Add Attendance table for tracking who actually attended events
CREATE TABLE event_attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, person_id)
);

-- Add RLS policies
ALTER TABLE event_attendances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on event_attendances" ON event_attendances
  FOR ALL USING (true) WITH CHECK (true);

-- Add indexes for faster queries
CREATE INDEX idx_event_attendances_event_id ON event_attendances(event_id);
CREATE INDEX idx_event_attendances_person_id ON event_attendances(person_id);
