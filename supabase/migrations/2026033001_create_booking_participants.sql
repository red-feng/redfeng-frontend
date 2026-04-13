create table if not exists public.booking_participants (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  participant_type text not null check (participant_type in ('adult', 'child')),
  sequence_no integer not null check (sequence_no > 0),
  full_name text not null,
  identity_number text not null,
  nationality text not null,
  age integer not null check (age >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists booking_participants_booking_type_sequence_idx
  on public.booking_participants (booking_id, participant_type, sequence_no);

create index if not exists booking_participants_booking_idx
  on public.booking_participants (booking_id, participant_type, sequence_no);
