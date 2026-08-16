create extension if not exists pgcrypto;

create table if not exists public.demo_availability_slots (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'booked', 'blocked')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint demo_slot_time_order check (ends_at > starts_at)
);

create unique index if not exists demo_availability_slots_starts_at_idx
  on public.demo_availability_slots (starts_at);

create table if not exists public.demo_bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid references public.demo_availability_slots(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  company text,
  team_size text,
  monthly_leads text,
  main_goal text,
  urgency text,
  score integer not null default 0,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists demo_bookings_slot_id_idx on public.demo_bookings (slot_id);
create index if not exists demo_bookings_created_at_idx on public.demo_bookings (created_at desc);
