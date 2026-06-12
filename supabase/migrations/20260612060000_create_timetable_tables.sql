-- Time Table feature: settings & entries
-- timetable_settings: stores bell/timing configuration per standard
create table if not exists timetable_settings (
  id uuid primary key default gen_random_uuid(),
  standard_id uuid not null references standards(id) on delete cascade,
  school_start_time time not null default '09:30',
  school_end_time time not null default '14:15',
  period_duration_minutes int not null default 35,
  num_breaks int not null default 2,
  periods_before_break_1 int not null default 2,
  break_1_duration_minutes int not null default 15,
  periods_before_break_2 int default 3,
  break_2_duration_minutes int default 25,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint timetable_settings_standard_unique unique (standard_id)
);

-- timetable_entries: stores the generated timetable slots
create table if not exists timetable_entries (
  id uuid primary key default gen_random_uuid(),
  standard_id uuid not null references standards(id) on delete cascade,
  day_of_week int not null check (day_of_week between 1 and 6),
  period_number int not null check (period_number >= 1),
  subject_id uuid references subjects(id) on delete set null,
  subject_name_override text,
  created_at timestamptz not null default now(),
  constraint timetable_entries_unique unique (standard_id, day_of_week, period_number)
);

-- RLS policies
alter table timetable_settings enable row level security;
alter table timetable_entries enable row level security;

-- Read access for authenticated users
create policy "timetable_settings_select" on timetable_settings
  for select to authenticated using (true);

create policy "timetable_entries_select" on timetable_entries
  for select to authenticated using (true);

-- Insert/Update/Delete for authenticated users (server actions enforce admin check)
create policy "timetable_settings_insert" on timetable_settings
  for insert to authenticated with check (true);

create policy "timetable_settings_update" on timetable_settings
  for update to authenticated using (true);

create policy "timetable_settings_delete" on timetable_settings
  for delete to authenticated using (true);

create policy "timetable_entries_insert" on timetable_entries
  for insert to authenticated with check (true);

create policy "timetable_entries_update" on timetable_entries
  for update to authenticated using (true);

create policy "timetable_entries_delete" on timetable_entries
  for delete to authenticated using (true);
