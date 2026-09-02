# 0001: Preserve approved event plan revisions

## Status

Accepted

## Context

An Event Manager needs to see the approved Event Plan before a customer-driven Event Change, the current approved plan after YOXA and any required human approvals complete, and the sequence of decisions between those states. Replacing values in place would hide the operational history that the dashboard is intended to make visible.

## Decision

Store an immutable approved Event Plan Revision for the baseline and for every later approved change. The Event Dashboard shows the current approved values, the delta from the baseline, and a timestamped change timeline.

Chat remains the place for the request, YOXA messages, approvals, and generated documents. A future structured YOXA callback will create the approved revision; the dashboard must not infer plan data by parsing Markdown responses.

## Consequences

- The dashboard can show an auditable before/after story, such as 100 guests changing to 120 guests.
- Event detail pages can show current state, previous state, and the change that produced the revision.
- The data model needs revision records and structured fields or payloads for future YOXA-approved updates.
- Existing Chat messages remain useful evidence but are not the source of truth for dashboard metrics.
