-- Fix ambiguous references to the RPC output column revision_number.
-- The original function body is otherwise unchanged.
create or replace function public.apply_yoxa_event_change(
  p_event_id uuid,
  p_conversation_id uuid,
  p_trigger_id uuid,
  p_change_summary text,
  p_changes jsonb,
  p_markdown text
)
returns table (
  application_id uuid,
  message_id uuid,
  revision_id uuid,
  revision_number integer,
  already_applied boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application public.yoxa_event_change_applications%rowtype;
  v_conversation public.event_conversations%rowtype;
  v_context public.event_contexts%rowtype;
  v_snapshot jsonb;
  v_revision_id uuid;
  v_message_id uuid;
  v_revision_number integer;
begin
  if jsonb_typeof(p_changes) <> 'object' or p_changes = '{}'::jsonb then
    raise exception 'changes must be a non-empty JSON object';
  end if;

  select * into v_application
  from public.yoxa_event_change_applications
  where conversation_id = p_conversation_id and trigger_id = p_trigger_id;

  if found then
    return query
    select
      v_application.id,
      v_application.message_id,
      v_application.revision_id,
      (select r.revision_number from public.event_plan_revisions r where r.id = v_application.revision_id),
      true;
    return;
  end if;

  select * into v_conversation
  from public.event_conversations
  where id = p_conversation_id
  for update;

  if not found then
    raise exception 'Event conversation not found';
  end if;

  if v_conversation.event_id is not null and v_conversation.event_id <> p_event_id then
    raise exception 'Event does not match this conversation';
  end if;

  if v_conversation.event_id is null then
    update public.event_conversations
    set event_id = p_event_id
    where id = p_conversation_id;
  end if;

  select * into v_context
  from public.event_contexts
  where event_id = p_event_id
  for update;

  if not found then
    raise exception 'Approved event context not found';
  end if;

  select coalesce(max(r.revision_number), 0) + 1
  into v_revision_number
  from public.event_plan_revisions r
  where r.event_id = p_event_id;

  select r.plan_snapshot into v_snapshot
  from public.event_plan_revisions r
  where r.event_id = p_event_id
  order by r.revision_number desc
  limit 1;

  v_snapshot := coalesce(v_snapshot, v_context.approved_context -> 'event_baseline', '{}'::jsonb) || p_changes;

  update public.event_contexts
  set approved_context = jsonb_set(
    approved_context,
    '{event_baseline}',
    coalesce(approved_context -> 'event_baseline', '{}'::jsonb) || p_changes,
    true
  ), updated_at = now()
  where id = v_context.id;

  update public.event_wedding_profiles
  set
    guest_count = case when p_changes ? 'guest_count' then (p_changes ->> 'guest_count')::integer else guest_count end,
    rooms = case when p_changes ? 'rooms' then (p_changes ->> 'rooms')::integer else rooms end,
    room_nights = case when p_changes ? 'room_nights' then (p_changes ->> 'room_nights')::integer else room_nights end,
    dinner_tables = case when p_changes ? 'dinner_tables' then (p_changes ->> 'dinner_tables')::integer else dinner_tables end,
    guest_count_with_buffer = case when p_changes ? 'guest_count_with_buffer' then (p_changes ->> 'guest_count_with_buffer')::integer else guest_count_with_buffer end,
    meals = case when p_changes ? 'meals' then (p_changes ->> 'meals')::integer else meals end,
    brunch_guests = case when p_changes ? 'brunch_guests' then (p_changes ->> 'brunch_guests')::integer else brunch_guests end,
    required_shuttles = case when p_changes ? 'required_shuttles' then (p_changes ->> 'required_shuttles')::integer else required_shuttles end,
    total_estimated_cost = case when p_changes ? 'total_estimated_cost_usd' then (p_changes ->> 'total_estimated_cost_usd')::numeric else total_estimated_cost end,
    updated_at = now()
  where event_id = p_event_id;

  insert into public.event_plan_revisions (
    event_id, revision_number, status, summary, plan_snapshot, event_conversation_id
  ) values (
    p_event_id, v_revision_number, 'approved', p_change_summary, v_snapshot, p_conversation_id
  ) returning id into v_revision_id;

  insert into public.conversation_messages (
    conversation_id, role, category, content_markdown
  ) values (
    p_conversation_id, 'assistant', 'approved_change', p_markdown
  ) returning id into v_message_id;

  insert into public.yoxa_event_change_applications (
    event_id, conversation_id, trigger_id, revision_id, message_id, change_summary, changes
  ) values (
    p_event_id, p_conversation_id, p_trigger_id, v_revision_id, v_message_id, p_change_summary, p_changes
  ) returning * into v_application;

  return query select v_application.id, v_message_id, v_revision_id, v_revision_number, false;
end;
$$;

revoke all on function public.apply_yoxa_event_change(uuid, uuid, uuid, text, jsonb, text) from public;
grant execute on function public.apply_yoxa_event_change(uuid, uuid, uuid, text, jsonb, text) to service_role;
