-- RabiesPulse AI: anonymous community reports (APK -> Supabase -> officer website).
-- Paste this once into Supabase > SQL Editor > Run.
-- No name, phone number, photo, note or exact location is stored: only the ward.
create table if not exists public.reports (
  id uuid primary key,
  created_at timestamptz not null default now(),
  incident_date date not null,
  animal text not null check (animal in ('dog', 'cat', 'monkey', 'other')),
  exposure text not null check (exposure in ('bite', 'scratch', 'lick', 'other')),
  ward text check (char_length(ward) <= 8),
  zone text check (char_length(zone) <= 40)
);
alter table public.reports enable row level security;
drop policy if exists "anyone can add a report" on public.reports;
create policy "anyone can add a report" on public.reports for insert to anon with check (true);
drop policy if exists "anyone can read reports" on public.reports;
create policy "anyone can read reports" on public.reports for select to anon using (true);
-- approximate position (rounded to about 1 km) so reports outside the ward map still show
alter table public.reports add column if not exists lat numeric check (lat between 8 and 14);
alter table public.reports add column if not exists lon numeric check (lon between 76 and 81);
grant insert, select on public.reports to anon;
