-- Eu Levo — guest codes
--
-- Every guest phone (anonymous auth user = "device") gets a random 6-digit code, e.g. 482913.
-- Guests see it on their screens and can read it out; hosts see the same code next to each
-- claim. It replaces the rough location as the way to tell who picked what.
--
-- Additive only: nothing existing is renamed or dropped. The location columns on `claims`
-- stay (older app builds still send them); the app simply stops asking for a location.
--
-- Self-healing: a code is created (1) when a phone opens a list with the new app
-- (`my_guest_code()`), (2) for every new claim, whatever app version made it (trigger),
-- and (3) right now for every phone that already has a claim (backfill at the bottom).

create table if not exists public.guest_codes (
  device_id  uuid primary key,
  code       text not null unique check (code ~ '^[0-9]{6}$'),
  created_at timestamptz not null default now()
);

alter table public.guest_codes enable row level security;

-- Hosts can read the codes of guests who claimed something in one of their lists.
-- Guests never read this table directly; they get their own code from my_guest_code().
drop policy if exists "hosts read their guests' codes" on public.guest_codes;
create policy "hosts read their guests' codes" on public.guest_codes
  for select to authenticated
  using (
    exists (
      select 1 from public.claims c
      where c.device_id = guest_codes.device_id
        and public.is_list_admin(c.list_id)
    )
  );

-- Returns the device's code, creating it on first use. Retries if the random code is taken.
create or replace function public.ensure_guest_code(p_device uuid)
returns text
language plpgsql volatile security definer
set search_path = public
as $$
declare
  c text;
begin
  if p_device is null then
    return null;
  end if;

  select code into c from public.guest_codes where device_id = p_device;
  if found then
    return c;
  end if;

  loop
    c := lpad(floor(random() * 1000000)::int::text, 6, '0');
    begin
      insert into public.guest_codes (device_id, code) values (p_device, c);
      return c;
    exception when unique_violation then
      -- Either this device got a code at the same moment (use it), or the number was taken (try another).
      select code into c from public.guest_codes where device_id = p_device;
      if found then
        return c;
      end if;
    end;
  end loop;
end;
$$;

-- The calling phone's own code. Called by the guest screens when a list opens.
create or replace function public.my_guest_code()
returns text
language plpgsql volatile security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  return public.ensure_guest_code(auth.uid());
end;
$$;

-- Every new claim gets its phone a code, even when an older app build made the claim.
create or replace function public.claims_ensure_guest_code()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  perform public.ensure_guest_code(new.device_id);
  return new;
end;
$$;

drop trigger if exists claims_ensure_guest_code on public.claims;
create trigger claims_ensure_guest_code
after insert on public.claims
for each row execute function public.claims_ensure_guest_code();

revoke all on function public.ensure_guest_code(uuid) from public, anon, authenticated;
revoke all on function public.claims_ensure_guest_code() from public, anon, authenticated;
revoke all on function public.my_guest_code() from public, anon;
grant execute on function public.my_guest_code() to authenticated;

-- Backfill: phones that already claimed something get their code now.
select public.ensure_guest_code(d.device_id)
from (select distinct device_id from public.claims) d;
