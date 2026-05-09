create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  password_salt text not null,
  public_key text not null,
  encrypted_private_key text not null,
  private_key_iv text not null,
  kdf_salt text not null,
  key_algorithm text not null default 'ECDH-P-256',
  key_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a_email text not null references public.users(email) on delete cascade,
  user_b_email text not null references public.users(email) on delete cascade,
  created_at timestamptz not null default now(),
  constraint conversations_distinct_users_check check (user_a_email <> user_b_email),
  constraint conversations_ordered_users_check check (user_a_email < user_b_email),
  constraint conversations_users_unique unique (user_a_email, user_b_email)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_email text not null references public.users(email) on delete cascade,
  receiver_email text not null references public.users(email) on delete cascade,
  ciphertext text not null,
  iv text not null,
  mac text not null,
  algorithm text not null default 'AES-256-CTR',
  timestamp timestamptz not null default now()
);

create index if not exists users_email_idx on public.users(email);
create index if not exists conversations_user_a_email_idx
  on public.conversations(user_a_email);
create index if not exists conversations_user_b_email_idx
  on public.conversations(user_b_email);
create index if not exists messages_sender_receiver_timestamp_idx
  on public.messages(sender_email, receiver_email, timestamp);
create index if not exists messages_receiver_sender_timestamp_idx
  on public.messages(receiver_email, sender_email, timestamp);

alter table public.users enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

revoke all on table public.users from anon, authenticated;
revoke all on table public.conversations from anon, authenticated;
revoke all on table public.messages from anon, authenticated;

grant select, insert, update, delete on table public.users to service_role;
grant select, insert, update, delete on table public.conversations to service_role;
grant select, insert, update, delete on table public.messages to service_role;
grant usage, select on all sequences in schema public to service_role;
