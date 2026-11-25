-- Run ONCE in Supabase SQL Editor, after schema.sql. Adds email login support, extended application details, and inquiries.
alter table profiles add column if not exists email text;

alter table applications add column if not exists batch text;
alter table applications add column if not exists age integer;
alter table applications add column if not exists city text;
alter table applications add column if not exists experience text;
alter table applications add column if not exists pay_plan text;
alter table applications add column if not exists notes text;
alter table applications add column if not exists paid_inr integer;
alter table applications add column if not exists payment_id text;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, phone, email, full_name)
  values (new.id, new.phone, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(profiles.full_name, excluded.full_name);
  return new;
end $$;

update profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;

-- Make yourself admin (run with your signup email):
-- update profiles set role = 'admin' where email = 'yogesh333570@gmail.com';
