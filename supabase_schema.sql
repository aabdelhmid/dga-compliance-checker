-- Create scans table
create table public.scans (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  url text not null,
  scan_type text check (scan_type in ('single', 'full')) not null,
  score integer not null,
  status text not null,
  total_pages integer default 1,
  violations_count integer default 0,
  passed_count integer default 0,
  scan_data jsonb -- Stores full report details if needed
);

-- Enable Row Level Security (RLS)
alter table public.scans enable row level security;

-- Create policy to allow anyone to insert scans (for public tool)
create policy "Enable insert for all users" on public.scans
  for insert with check (true);

-- Create policy to allow anyone to read scans (optional, or restrict to own)
create policy "Enable read for all users" on public.scans
  for select using (true);
