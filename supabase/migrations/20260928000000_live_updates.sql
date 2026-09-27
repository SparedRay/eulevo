-- Live updates: whenever a list, one of its gifts or one of its claims changes, broadcast a bare
-- "changed" message on the Realtime topic `list:<list id>`. Open screens (guest list, confirm screen,
-- host screens) refetch through the same functions they already use, so the message carries no data
-- and guests still never see other guests' claims.
--
-- Uses Supabase Realtime "Broadcast from Database" (realtime.send). The channel is public
-- (private = false): knowing a list id only lets you hear that *something* changed.
-- Needs Realtime → Settings → "Allow public access" on (the default).

create or replace function public.notify_list_changed()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  r jsonb;
  changed_list uuid;
begin
  if tg_op = 'DELETE' then
    r := to_jsonb(old);
  else
    r := to_jsonb(new);
  end if;
  if tg_table_name = 'lists' then
    changed_list := (r ->> 'id')::uuid;
  else
    changed_list := (r ->> 'list_id')::uuid;
  end if;

  begin
    perform realtime.send('{}'::jsonb, 'changed', 'list:' || changed_list::text, false);
  exception when others then
    -- A Realtime hiccup must never block a claim or a save; screens also refresh on their own.
    null;
  end;
  return null;
end;
$$;

revoke all on function public.notify_list_changed() from public, anon, authenticated;

create trigger lists_notify_changed
after update or delete on public.lists
for each row execute function public.notify_list_changed();

create trigger gifts_notify_changed
after insert or update or delete on public.gifts
for each row execute function public.notify_list_changed();

create trigger claims_notify_changed
after insert or update or delete on public.claims
for each row execute function public.notify_list_changed();
