-- Create push_subscriptions table for storing device subscriptions
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_notified_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- Add RLS policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on push_subscriptions" ON push_subscriptions
  FOR ALL USING (true) WITH CHECK (true);

-- Add index for faster queries
CREATE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX idx_push_subscriptions_active ON push_subscriptions(is_active);
