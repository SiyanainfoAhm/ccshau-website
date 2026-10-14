create table if not exists public.ccshau_visitor_stats (
  id boolean primary key default true check (id),
  total_visits bigint not null default 0 check (total_visits >= 0),
  updated_at timestamptz not null default now()
);

insert into public.ccshau_visitor_stats (id, total_visits)
values (true, 0)
on conflict (id) do nothing;

create table if not exists public.ccshau_visitor_dedup (
  visitor_id uuid primary key,
  counted_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists ccshau_visitor_dedup_expires_at_idx
  on public.ccshau_visitor_dedup (expires_at);

alter table public.ccshau_visitor_stats enable row level security;
alter table public.ccshau_visitor_dedup enable row level security;

create or replace function public.ccshau_record_visitor_visit(
  p_visitor_id uuid,
  p_window interval default interval '30 minutes'
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total bigint;
begin
  delete from public.ccshau_visitor_dedup
  where expires_at < now();

  insert into public.ccshau_visitor_dedup (visitor_id, expires_at)
  values (p_visitor_id, now() + p_window)
  on conflict (visitor_id) do nothing;

  if found then
    update public.ccshau_visitor_stats
    set total_visits = total_visits + 1,
        updated_at = now()
    where id = true
    returning total_visits into v_total;
  else
    select total_visits into v_total
    from public.ccshau_visitor_stats
    where id = true;
  end if;

  return coalesce(v_total, 0);
end;
$$;

revoke all on table public.ccshau_visitor_stats from anon, authenticated;
revoke all on table public.ccshau_visitor_dedup from anon, authenticated;
revoke all on function public.ccshau_record_visitor_visit(uuid, interval) from public, anon, authenticated;
grant execute on function public.ccshau_record_visitor_visit(uuid, interval) to service_role;
