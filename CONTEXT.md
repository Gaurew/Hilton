# Hilton Event Change Workspace

A guest-facing workspace for reviewing and requesting changes to an event plan.

## Language

**Demo Visitor**:
An unauthenticated person using the client demonstration. A Demo Visitor can start and continue event-change conversations in the initial release.
_Avoid_: Authenticated user, account holder

**Visitor Identity**:
A stable application identifier associated with one person's Event Conversations and Event Plans, whether or not that person has signed in.
_Avoid_: Account, login identity

**Demo Dataset**:
Event Conversations and Event Plans produced by actual test runs and stored for a client demonstration.
_Avoid_: Mock data, fabricated data

**Showcase Conversation**:
A completed, preloaded Event Conversation that demonstrates a finished event-change journey. It can be viewed or deleted but cannot be continued.
_Avoid_: Active event, working copy

**New Conversation**:
A new Event Conversation started by a Demo Visitor to request a change to an Event Plan.
_Avoid_: Continue conversation

**Event Resolution**:
The determination of which Event Plan a requested Event Change concerns, using the visitor's available event context and the request.
_Avoid_: Event selection

**Event Conversation**:
A persisted chronological record of a Demo Visitor's requests, agent responses, and generated assets relating to one Event Plan.
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

**Event Change**:
A requested modification to an Event Plan that may affect capacity, inventory, supplier commitments, or commercial terms.
_Avoid_: Update, amendment

**Change Brief**:
A complete request that identifies the Event Plan, the required Event Change, constraints to preserve, and the confirmation sought.
_Avoid_: Prompt, ticket
