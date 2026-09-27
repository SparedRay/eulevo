-- Host tools: co-hosts can leave, owners can hand a list over, and claim updates are narrowed.
-- (Deleting a list already works through the "owner deletes list" policy.)

-- ---------------------------------------------------------------------------
-- The owner always stays a host of their own list. Without this, the owner could delete their
-- own list_admins row through "owner manages co-hosts" and lose access to the list they own.
-- (List deletion still cascades: referential actions bypass row security.)
-- ---------------------------------------------------------------------------

create policy "owner stays a host" on public.list_admins
  as restrictive
  for delete to authenticated
  using (not exists (select 1 from public.lists l where l.id = list_id and l.owner_id = user_id));

-- Co-hosts can leave a list on their own.
create policy "co-hosts leave" on public.list_admins
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Hand a list over to one of its co-hosts. The old owner stays on as a co-host.
-- Returns false if the caller isn't the owner or the new owner isn't a host of the list.
-- ---------------------------------------------------------------------------

create or replace function public.transfer_ownership(p_list uuid, p_user uuid)
returns boolean
language plpgsql volatile security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.lists where id = p_list and owner_id = auth.uid()) then
    return false;
  end if;
  if not exists (select 1 from public.list_admins where list_id = p_list and user_id = p_user) then
    return false;
  end if;
  update public.lists set owner_id = p_user where id = p_list;
  return true;
end;
$$;

revoke all on function public.transfer_ownership(uuid, uuid) from public, anon;
grant execute on function public.transfer_ownership(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Claims: hosts only write area_label directly (the neighbourhood looked up from the rounded
-- location). Releasing goes through release_claim(), so nothing else needs a direct update.
-- ---------------------------------------------------------------------------

revoke update on public.claims from anon, authenticated;
grant update (area_label) on public.claims to authenticated;
