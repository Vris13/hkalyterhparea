-- Memory Book: shared memories schema
-- Run once in the Supabase SQL Editor.

create table if not exists memories (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  start_date date not null,
  end_date date,
  place text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists memory_people (
  memory_id uuid references memories(id) on delete cascade not null,
  person_id uuid references people(id) on delete cascade not null,
  primary key (memory_id, person_id)
);

create table if not exists memory_photos (
  id uuid default uuid_generate_v4() primary key,
  memory_id uuid references memories(id) on delete cascade not null,
  url text not null,
  position integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table memories enable row level security;
alter table memory_people enable row level security;
alter table memory_photos enable row level security;

create policy "Enable all operations on memories" on memories for all using (true);
create policy "Enable all operations on memory_people" on memory_people for all using (true);
create policy "Enable all operations on memory_photos" on memory_photos for all using (true);

create index if not exists memory_people_person_id_idx on memory_people(person_id);
create index if not exists memory_photos_memory_id_idx on memory_photos(memory_id);
