# Hilton Event Manager Workspace

An authenticated internal workspace for Event Managers to review Event Plans and coordinate Event Changes.

## Language

**Event Manager**:
The signed-in Hilton colleague responsible for reviewing assigned Event Plans and initiating Event Changes from a customer request.
_Avoid_: Demo Visitor, customer

**Event Manager Workspace**:
The set of Event Plans, Event Conversations, and operational work assigned to one Event Manager. The initial demonstration uses one shared authenticated workspace.
_Avoid_: Visitor Identity, account

**Demo Dataset**:
Seeded Event Plans and completed Event Changes that make the demonstration workspace representative without standing in for a live client record.
_Avoid_: Mock data, fabricated data

**Showcase Conversation**:
A completed, preloaded Event Conversation that demonstrates a finished event-change journey. It can be viewed or deleted but cannot be continued.
_Avoid_: Active event, working copy

**New Conversation**:
A new Event Conversation started by an Event Manager to request a change to an Event Plan.
_Avoid_: Continue conversation

**Event Resolution**:
The determination of which Event Plan a requested Event Change concerns, using the Event Manager Workspace's available Event Context and the request.
_Avoid_: Event selection

**Event Conversation**:
A persisted chronological record of an Event Manager's requests, agent responses, approvals, and generated assets relating to one Event Plan.
_Avoid_: Chat, session

**Agent Response**:
A YOXA-provided message within an Event Conversation. It may contain rendered Markdown and may reference generated assets.
_Avoid_: Plain text output

**Generated Asset**:
A file made available by YOXA, such as a PDF change summary, that can be opened from its associated Agent Response.
_Avoid_: Attachment-only view

**Event Context**:
The stored information that identifies an Event Plan and its relevant commitments, constraints, and reference records for evaluating an Event Change.
_Avoid_: Prompt context, chat context

**Baseline**:
The approved state of an Event Plan before an Event Change is assessed.
_Avoid_: Original request

**Event Plan**:
The agreed arrangement for one event, including attendance, accommodation, food and beverage, services, vendors, and commercial terms.
_Avoid_: Booking, itinerary

**Event Plan Revision**:
An immutable, timestamped approved version of an Event Plan that records the values before and after an Event Change.
_Avoid_: Overwrite, current-state-only update

**Event Change**:
A requested modification to an Event Plan that may affect capacity, inventory, supplier commitments, or commercial terms.
_Avoid_: Update, amendment

**Change Brief**:
A complete request that identifies the Event Plan, the required Event Change, constraints to preserve, and the confirmation sought.
_Avoid_: Prompt, ticket
