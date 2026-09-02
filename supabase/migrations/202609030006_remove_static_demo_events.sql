-- Retain exactly one production-like source-of-truth event: HIL-WED-260919.
-- Preserve every conversation, revision, approval, and asset associated with that event.
-- All seeded examples, connector-test fixtures, and cloned event rows are removed.

-- Storage objects are managed by the Storage API and are not editable in a SQL migration.
-- Deleting the related conversation rows removes every UI-visible asset record.

-- Approval webhook IDs are YOXA IDs, not Hilton event IDs. Delete only tasks tied to
-- discarded conversations (and historical orphan tasks), preserving target-event HITL state.
delete from public.yoxa_approval_tasks
where conversation_id in (
  select id from public.event_conversations
  where event_id is distinct from '22222222-2222-4222-8222-222222222222'::uuid
)
  or conversation_id is null;

delete from public.yoxa_webhook_events w
where not exists (
  select 1 from public.yoxa_approval_tasks t where t.event_id = w.event_id
);

delete from public.event_conversations
where event_id is distinct from '22222222-2222-4222-8222-222222222222'::uuid;

delete from public.hilton_events
where id is distinct from '22222222-2222-4222-8222-222222222222'::uuid;

delete from public.hilton_visitors v
where not exists (select 1 from public.hilton_events e where e.visitor_id = v.id)
  and not exists (select 1 from public.event_conversations c where c.visitor_id = v.id);
