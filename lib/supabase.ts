import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
export type Person = {
  id: string;
  name: string;
  phone?: string;
  birthday?: string;
  bio?: string;
  profile_photo?: string;
  created_at: string;
  updated_at: string;
};

export type Event = {
  id: string;
  title: string;
  date: string;
  details?: string;
  created_at: string;
  updated_at: string;
};

export type Photo = {
  id: string;
  url: string;
  public_id: string;
  person_id?: string;
  event_id?: string;
  created_at: string;
};
