# Workflow Engine (SOP Builder) — Design Spec

**Date:** 2026-04-05
**Module:** Core Platform Feature
**Status:** Draft

---

## 1. Problem

All three modules (Sales, Support, Inventory) have hardcoded statuses and zero transition validation. Different clients have different internal processes — a hardware sales workflow differs from software sales. The current rigid status system prevents product adoption because clients cannot map their real SOPs into the tool.

### Current State (to be removed)

| Module | Entity | Hardcoded Statuses | Location |
|--------|--------|--------------------|----------|
| Sales | Lead | 13 statuses (new_lead → project_completed, lost) | `leads/models.py` LeadStatus enum, `leads/service.py` lines 84-92, `frontend/modules/leads/pages/Leads.js` lines 45-82 |
| Sales | BOQ | 5 statuses (draft → expired) | `orders/models.py` line 35 |
| Sales | Sales Order | 6 statuses (pending → cancelled) | `orders/models.py` line 69, `orders/service.py` lines 237-249 |
| Sales | Purchase Order | 6 statuses (draft → cancelled) | `orders/models.py` line 109, `orders/service.py` lines 306-317 |
| Support | Ticket | 7 statuses (open → cancelled) | `support/models.py` lines 13-20, `support/service.py` lines 96-100 |
| Support | Feedback | 4 statuses | `support/models.py` line 62 |
| Support | Issue Logging | 4 statuses | `support/models.py` line 80 |
| Inventory | Factory Order | 8 statuses | `inventory/models.py` lines 28-36 |
| Inventory | In-Transit | 6 statuses | `inventory/models.py` lines 39-45 |
| Inventory | RMA | 7 statuses | `inventory/models.py` lines 78-85 |

Frontend duplicates: `frontend/src/modules/leads/pages/Leads.js`, `frontend/src/modules/sales-orders/pages/SalesOrders.js`, `frontend/src/modules/support/pages/SupportTickets.js`, `frontend/src/modules/inventory/constants.js`

---

## 2. Solution Overview

A **Workflow Engine** that lets users define SOPs (Standard Operating Procedures) per module using a visual linear pipeline builder. Each SOP defines:

- **States** — ordered nodes in the pipeline (act as dynamic statuses)
- **Transitions** — allowed paths between states with optional form fields
- **Transition Logs** — audit trail of every state change with captured form data

### Key Behaviors

1. SOP is defined at the **module level** (Sales, Support, Inventory)
2. **Multiple SOPs per module** are allowed (e.g., "Hardware Sales SOP", "Software Sales SOP")
3. When creating a record (lead, ticket, etc.), the user **selects which SOP** to activate
4. The record's "status" is its **current state** within the activated SOP
5. Status transitions are **validated** against the SOP's allowed transitions
6. Transition forms capture data stored as **separate transition logs**, not on the parent record
7. Listing pages render **dynamic stats cards** based on the SOP's defined states
8. Old hardcoded statuses are **fully removed** from backend and frontend

---

## 3. Data Model

### 3.1 `sop_workflows` Collection

```json
{
  "id": "string (uuid)",
  "name": "string",
  "description": "string (optional)",
  "module": "string (sales | support | inventory)",
  "version": "integer (starts at 1, increments on edit)",
  "is_active": "boolean (default true)",
  "states": [
    {
      "id": "string (uuid)",
      "name": "string",
      "position": "integer (0-based order in pipeline)",
      "color": "string (hex color for UI rendering)",
      "description": "string (optional, tooltip text)",
      "is_start": "boolean (exactly one per SOP)",
      "is_end": "boolean (can be multiple, e.g. Won + Lost)"
    }
  ],
  "transitions": [
    {
      "id": "string (uuid)",
      "from_state_id": "string (references states[].id)",
      "to_state_id": "string (references states[].id)",
      "name": "string (action label, e.g. 'Send Proposal')",
      "form_fields": [
        {
          "id": "string (uuid)",
          "label": "string",
          "type": "string (text | number | date | select | textarea | file)",
          "required": "boolean",
          "placeholder": "string (optional)",
          "options": ["string[] (for select type only)"],
          "default_value": "string (optional)"
        }
      ]
    }
  ],
  "created_by": "string (user_id)",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

**Validation rules:**
- Exactly one state must have `is_start: true`
- At least one state must have `is_end: true`
- `from_state_id` and `to_state_id` in transitions must reference existing state IDs
- No duplicate transitions (same from + to pair)
- State names must be unique within an SOP
- An end state cannot have outgoing transitions

**Versioning:** When an SOP is edited, `version` increments. Records already using the SOP continue on their current state. If a record's `current_state_id` no longer exists in the updated SOP, it is marked as "orphaned" and must be manually resolved (admin can remap). New records always use the latest version.

### 3.2 `transition_logs` Collection

```json
{
  "id": "string (uuid)",
  "record_id": "string (the lead/ticket/order id)",
  "record_type": "string (lead | ticket | sales_order | purchase_order | boq | factory_order | rma)",
  "module": "string (sales | support | inventory)",
  "sop_id": "string (references sop_workflows.id)",
  "sop_version": "integer (version at time of transition)",
  "from_state_id": "string (null for initial assignment)",
  "from_state_name": "string (denormalized for history readability)",
  "to_state_id": "string",
  "to_state_name": "string (denormalized)",
  "transition_id": "string (references transitions[].id)",
  "transition_name": "string (denormalized)",
  "form_data": "object (key-value pairs of submitted form fields)",
  "performed_by": "string (user_id)",
  "performed_by_name": "string (denormalized)",
  "performed_at": "datetime",
  "notes": "string (optional, free-text comment)"
}
```

**Indexes:**
- `{ record_id: 1, performed_at: -1 }` — fetch history for a record
- `{ sop_id: 1, performed_at: -1 }` — analytics per SOP
- `{ module: 1, performed_at: -1 }` — module-level analytics

### 3.3 Changes to Existing Entity Collections

Every SOP-driven entity (leads, tickets, sales_orders, purchase_orders, boqs, factory_orders, rma) gets these fields replacing the old `status`:

```json
{
  "sop_id": "string (references sop_workflows.id)",
  "sop_version": "integer",
  "current_state_id": "string (references sop_workflows.states[].id)",
  "current_state_name": "string (denormalized for queries/display)"
}
```

**Migration strategy:** Existing records with old `status` values will be migrated:
1. Create a "Legacy" SOP per module with states matching the old hardcoded statuses
2. Assign all existing records to the Legacy SOP
3. Map old `status` values to the corresponding Legacy SOP state
4. Remove old `status` field after migration is verified

---

## 4. Backend Architecture

### 4.1 New App Structure

```
backend/apps/workflow_engine/
  __init__.py
  models.py          # SOPWorkflow, TransitionLog, FormField Pydantic models
  schemas.py         # Request/response schemas for API
  service.py         # SOPService, TransitionService
  views.py           # CRUD endpoints for SOP management
  transition_views.py  # Transition execution and log endpoints
  validators.py      # SOP structure validation, transition validation
```

### 4.2 API Endpoints

#### SOP Management
```
POST   /api/workflow-engine/sops              # Create new SOP
GET    /api/workflow-engine/sops              # List SOPs (filter by module, is_active)
GET    /api/workflow-engine/sops/{id}         # Get SOP detail
PUT    /api/workflow-engine/sops/{id}         # Update SOP (increments version)
DELETE /api/workflow-engine/sops/{id}         # Soft delete (deactivate)
GET    /api/workflow-engine/sops/module/{module}  # List active SOPs for a module
```

#### Transition Execution
```
POST   /api/workflow-engine/transitions/execute    # Execute a transition on a record
GET    /api/workflow-engine/transitions/available/{record_type}/{record_id}  # Get available transitions for current state
GET    /api/workflow-engine/transitions/logs/{record_type}/{record_id}      # Get transition history for a record
```

#### Stats
```
GET    /api/workflow-engine/stats/{module}?sop_id={id}  # Get state-wise counts for listing page cards
```

### 4.3 Transition Execution Flow

```
1. Client calls POST /transitions/execute with:
   { record_type, record_id, transition_id, form_data }

2. Backend validates:
   a. Record exists
   b. Record has an active SOP
   c. Transition exists in the SOP
   d. Transition's from_state_id matches record's current_state_id
   e. form_data satisfies all required fields in transition's form_fields
   f. Field types are valid (number is numeric, date is valid date, etc.)

3. If valid:
   a. Update record's current_state_id and current_state_name
   b. Create transition_log entry
   c. Return success with new state

4. If invalid:
   a. Return 400 with specific error (wrong state, missing fields, etc.)
```

### 4.4 Integration with Existing Services

Each module's existing service (LeadService, TicketService, etc.) will:

1. **Remove** all hardcoded status enums, status validation, status-based stats
2. **Add** `sop_id` and `current_state_id` to create schemas (required)
3. **Replace** status-based filtering with `current_state_id` filtering
4. **Replace** hardcoded stats methods with calls to WorkflowEngine stats endpoint
5. **Delegate** all status changes to the WorkflowEngine transition execution

The WorkflowEngine is a **standalone service** — modules call it, not the other way around. No circular dependencies.

---

## 5. Frontend Architecture

### 5.1 New Module Structure

```
frontend/src/modules/workflow-engine/
  api.js                    # API calls to workflow engine endpoints
  index.js                  # Module exports
  pages/
    SOPList.js              # List all SOPs, filter by module
    SOPBuilder.js           # Visual linear pipeline builder (create/edit)
  components/
    PipelineEditor.js       # Drag-to-reorder states, draw connectors
    StateNode.js            # Individual state block in pipeline
    TransitionEdge.js       # Connector between states with config popover
    TransitionFormBuilder.js # Configure form fields for a transition
    FieldConfigRow.js       # Single field config (label, type, required, options)
    TransitionDialog.js     # Modal shown when user executes a transition (renders form)
    TransitionTimeline.js   # Shows transition history for a record
    StateStatsBar.js        # Dynamic stats cards component (replaces hardcoded cards)
    SOPSelector.js          # Dropdown to select SOP when creating a record
    StateBadge.js           # Colored badge showing current state (replaces hardcoded status badges)
```

### 5.2 SOP Builder UI (SOPBuilder.js + PipelineEditor.js)

**Layout:**
```
+---------------------------------------------------------------+
|  SOP Name: [__Hardware Sales__]   Module: [Sales v]           |
|  Description: [__Optional description__]                      |
+---------------------------------------------------------------+
|                                                                |
|  Pipeline:                                                     |
|                                                                |
|  [+ Add State]                                                 |
|                                                                |
|  +--------+     +--------+     +--------+     +--------+      |
|  | New    | --> | Review | --> | Won    | --> |        |      |
|  | Lead   |     |        |     | (end)  |     |        |      |
|  | #3B82F6|     | #F59E0B|     | #10B981|     |        |      |
|  +--------+     +--------+     +--------+     +--------+      |
|       |                                                        |
|       +------------------------------------------+             |
|                                                  v             |
|                                            +--------+          |
|                                            | Lost   |          |
|                                            | (end)  |          |
|                                            | #EF444 |          |
|                                            +--------+          |
|                                                                |
+---------------------------------------------------------------+
|  Transitions:                                                  |
|  +---------------------------------------------------+        |
|  | New Lead --> Review  [Send for Review]    [Edit]  |        |
|  | New Lead --> Lost    [Mark Lost]          [Edit]  |        |
|  | Review --> Won       [Mark Won]           [Edit]  |        |
|  | Review --> Lost      [Mark Lost]          [Edit]  |        |
|  +---------------------------------------------------+        |
|  [+ Add Transition]                                            |
+---------------------------------------------------------------+
```

**Interactions:**
- **States section:** Drag-to-reorder states vertically/horizontally. Click a state to edit name, color, start/end flags. Delete with confirmation.
- **Transitions section:** Listed below pipeline. Click "Edit" to open a popover/modal with:
  - From state (dropdown)
  - To state (dropdown)
  - Action name (text input)
  - Form fields list (add/remove/reorder simple field definitions)
- **Validation:** Save button validates SOP structure (one start state, at least one end state, no orphan states without transitions, etc.) and shows inline errors.
- **Drag-and-drop:** Use `@dnd-kit/core` (already lightweight, no heavy deps). States are sortable list items.

### 5.3 Transition Dialog (TransitionDialog.js)

When a user clicks a transition action on a record (e.g., "Send Proposal" button on a lead):

```
+------------------------------------------+
|  Send Proposal                           |
|  Moving: New Lead --> Proposal Sent      |
+------------------------------------------+
|                                          |
|  Discount %: [____15____] *              |
|                                          |
|  Notes: [_________________________]      |
|         [_________________________]      |
|                                          |
|  [Cancel]              [Confirm Move]    |
+------------------------------------------+
```

- Renders form fields dynamically based on transition's `form_fields` config
- Validates required fields before submission
- On success: record state updates, toast notification, listing page refreshes

### 5.4 Dynamic Stats Bar (StateStatsBar.js)

Replaces the hardcoded status cards on listing pages (Leads, Tickets, etc.):

```
+------------------------------------------+
|  SOP: [Hardware Sales SOP v]             |
+------------------------------------------+
|  +------+ +------+ +------+ +------+    |
|  |Total | |New   | |Review| |Won   |    |
|  |  12  | |  5   | |  4   | |  2   |    |
|  +------+ +------+ +------+ +------+    |
```

- Takes `module` and `sop_id` as props
- Fetches state-wise counts from `/api/workflow-engine/stats/{module}?sop_id={id}`
- Renders one card per state using the state's configured color
- SOP filter dropdown at top — switching SOP re-renders the cards and filters the list

### 5.5 Transition Timeline (TransitionTimeline.js)

Shown on record detail pages (LeadDetail, TicketDetail, etc.):

```
Timeline:
  |
  o  Created (New Lead)           — Apr 1, 2026, by John
  |
  o  Send for Review              — Apr 2, 2026, by John
  |  Form: { "Notes": "Promising client" }
  |
  o  Send Proposal                — Apr 3, 2026, by Sarah
  |  Form: { "Discount %": 15 }
  |
  * Current: Proposal Sent
```

### 5.6 Changes to Existing Pages

**Leads listing (Leads.js):**
- Remove: `STATUS_OPTIONS`, `STATUS_COLORS`, `PRIORITY_COLORS` constants
- Remove: Hardcoded stats cards section
- Add: `<StateStatsBar module="sales" />` component with SOP filter
- Replace: Status badge rendering with `<StateBadge stateId={lead.current_state_id} sopId={lead.sop_id} />`
- Replace: Status filter dropdown with dynamic states from selected SOP

**Lead form (LeadForm.js):**
- Remove: Status dropdown with hardcoded options
- Add: `<SOPSelector module="sales" />` — user picks which SOP when creating lead
- On SOP selection: auto-assign start state as `current_state_id`

**Lead detail (LeadDetail.js):**
- Remove: Status change dropdown
- Add: Available transition buttons (fetched from `/transitions/available/lead/{id}`)
- Add: `<TransitionTimeline recordType="lead" recordId={id} />`
- Clicking a transition button opens `<TransitionDialog />`

**Same pattern for:** SupportTickets.js, TicketDetail.js, SalesOrders.js, SalesOrderForm.js, and all Inventory pages.

---

## 6. Cleanup Plan (Old Code Removal)

### Backend — Remove

| File | What to remove |
|------|---------------|
| `apps/business/leads/models.py` | `LeadStatus` enum (lines 9-22), `status` field from Lead model |
| `apps/business/leads/service.py` | Hardcoded `all_statuses` list (lines 84-92), status-based stats logic (lines 113-114) |
| `apps/business/orders/models.py` | Status comments/defaults on BOQ (line 35), SalesOrder (line 69), PurchaseOrder (line 109) |
| `apps/business/orders/service.py` | Hardcoded stats in `get_stats()` for sales orders (lines 237-249) and purchase orders (lines 306-317) |
| `apps/support/models.py` | `TicketStatus` enum (lines 13-20), `TicketPriority` enum (lines 7-11), status fields on Feedback (line 62), IssueLogging (line 80) |
| `apps/support/service.py` | Status-based stats (lines 96-100), hardcoded status update logic (lines 79-88) |
| `apps/support/ticket_views.py` | Hardcoded `/request-feedback` and `/close` endpoints that force specific statuses (lines 61-82) |
| `apps/business/inventory/models.py` | `FactoryOrderStatus` enum (lines 28-36), `InTransitStatus` (lines 39-45), `RMAStatus` (lines 78-85) |
| `apps/business/inventory/service.py` | Auto-status logic in factory order service, in-transit status calculations |

### Frontend — Remove

| File | What to remove |
|------|---------------|
| `modules/leads/pages/Leads.js` | `STATUS_OPTIONS` (lines 45-82), `STATUS_COLORS`, `PRIORITY_COLORS`, hardcoded stats cards |
| `modules/sales-orders/pages/SalesOrders.js` | `getStatusBadge()` function (lines 113-126), hardcoded status variants |
| `modules/support/pages/SupportTickets.js` | `getStatusBadge()`, `getStatusIcon()`, `getPriorityBadge()` (lines 211-237), hardcoded status cards |
| `modules/inventory/constants.js` | Entire file — `FACTORY_ORDER_STATUS`, `IN_TRANSIT_STATUS`, `STOCK_TYPE`, `MOVEMENT_TYPE`, `RMA_STATUS` |

### Frontend — Also clean during refactor

| Issue | Files |
|-------|-------|
| Remove all `console.log` / `console.error` | 9 files (PurchaseOrderForm, Products, UserForm, SalesOrderForm, BOQVersionHistory, BOQs, BOQForm) |
| Centralize backend URL | Replace `process.env.REACT_APP_BACKEND_URL \|\| "http://localhost:8000"` in 9+ files with import from `lib/axios.js` |
| Remove redundant `getAuthHeader()` calls | All module api.js files — axios interceptor already handles this |

---

## 7. Migration Strategy

### Phase 1: Build Workflow Engine (no breaking changes)
- Create `sop_workflows` and `transition_logs` collections with indexes
- Build backend SOP CRUD + transition execution APIs
- Build frontend SOP Builder + shared components
- Everything runs in parallel with old system

### Phase 2: Integrate into modules
- Add `sop_id`, `current_state_id`, `current_state_name` fields to existing entities
- Create "Legacy" SOPs per module matching current hardcoded statuses
- Write migration script to assign all existing records to Legacy SOPs
- Update frontend listing/detail/form pages to use workflow engine components

### Phase 3: Remove old code
- Remove all hardcoded status enums, constants, stats logic
- Remove old status fields from models after verifying migration
- Clean console.logs, centralize backend URL, remove redundant auth headers

---

## 8. Database Indexes

### New indexes for `sop_workflows`
```
{ module: 1, is_active: 1 }          # List active SOPs per module
{ id: 1 }                             # Lookup by ID (unique)
```

### New indexes for `transition_logs`
```
{ record_id: 1, performed_at: -1 }    # History for a record
{ sop_id: 1, performed_at: -1 }       # Analytics per SOP
{ module: 1, performed_at: -1 }       # Module-level analytics
```

### Updated indexes on existing collections
```
# On leads, tickets, sales_orders, etc.
{ sop_id: 1, current_state_id: 1 }    # Stats aggregation per SOP + state
```

---

## 9. Routing

### Backend
All new endpoints under `/api/workflow-engine/` prefix.

### Frontend
```
/settings/workflows                    # SOP List page
/settings/workflows/new                # Create new SOP
/settings/workflows/:id/edit           # Edit existing SOP
```

Placed under Settings since SOP management is admin configuration.

---

## 10. Dependencies

### Backend
No new dependencies. Uses existing FastAPI, Pydantic, Motor stack.

### Frontend
- `@dnd-kit/core` + `@dnd-kit/sortable` — drag-and-drop for state reordering in pipeline builder (~15KB gzipped)
- No other new dependencies. Form rendering uses existing React Hook Form. UI uses existing Radix/shadcn components.

---

## 11. Out of Scope (Future)

- Conditional logic in form fields (show X if Y = value)
- Multi-step forms on transitions
- Role-based transition permissions (only managers can approve)
- SOP templates / marketplace
- Parallel states / branching paths
- Webhooks / notifications on transition
- Time-based auto-transitions (SLA timers)
