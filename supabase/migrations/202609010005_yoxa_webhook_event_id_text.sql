alter table public.yoxa_approval_tasks
  drop constraint if exists yoxa_approval_tasks_event_id_fkey;

alter table public.yoxa_webhook_events
  alter column event_id type text using event_id::text;

alter table public.yoxa_approval_tasks
  alter column event_id type text using event_id::text;

alter table public.yoxa_approval_tasks
  add constraint yoxa_approval_tasks_event_id_fkey
  foreign key (event_id) references public.yoxa_webhook_events(event_id) on delete cascade;
