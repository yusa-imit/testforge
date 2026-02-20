# TestForge QA Checklist

**Version:** 1.0.0
**Date:** 2026-02-20
**Phase:** Pre-Alpha Internal Testing

## Pre-Testing Setup

### 1. Environment Setup
- [ ] Bun runtime installed (v1.3+)
- [ ] Playwright browsers installed: `bunx playwright install chromium`
- [ ] Dependencies installed: `bun install`
- [ ] Database initialized: `bun run db:migrate`
- [ ] Seed data loaded: `bun run db:seed`

### 2. Start Development Servers
```bash
# Terminal 1 - Backend
bun run dev:server

# Terminal 2 - Frontend
bun run dev:web
```

- [ ] Backend running at http://localhost:3001
- [ ] Frontend running at http://localhost:3000
- [ ] No console errors on startup

---

## Core Functionality Tests

### Services Management (Priority: Critical)

#### List Services
- [ ] Navigate to http://localhost:3000/services
- [ ] See 2 seed services: "E-commerce Platform", "Admin Portal"
- [ ] Search by name works
- [ ] Search by description works
- [ ] Search by URL works
- [ ] Clear search resets results

#### Create Service
- [ ] Click "New Service" button
- [ ] Modal opens with form fields
- [ ] Fill required fields (name, baseUrl)
- [ ] Submit creates service
- [ ] New service appears in list
- [ ] Success notification shown

#### Edit Service
- [ ] Click on existing service
- [ ] Edit modal opens with current values
- [ ] Change name/description/URL
- [ ] Save updates service
- [ ] Changes reflected in list

#### Delete Service
- [ ] Click delete icon on service
- [ ] Confirmation dialog shown
- [ ] Confirm deletion
- [ ] Service removed from list
- [ ] Cannot delete service with features (error shown)

---

### Features Management (Priority: Critical)

#### List Features
- [ ] Navigate to a service's features page
- [ ] See seed features for that service
- [ ] Search by name works
- [ ] Priority filter (All/Critical/High/Medium/Low) works
- [ ] Clear filters resets view

#### Create Feature
- [ ] Click "New Feature"
- [ ] Fill name, description, owners
- [ ] Submit creates feature
- [ ] New feature appears in list

#### Edit Feature
- [ ] Click edit on feature
- [ ] Modal shows current values
- [ ] Update fields
- [ ] Save persists changes

#### Delete Feature
- [ ] Delete feature with no scenarios
- [ ] Confirmation dialog shown
- [ ] Feature deleted successfully
- [ ] Cannot delete feature with scenarios

---

### Scenarios Management (Priority: Critical)

#### List Scenarios
- [ ] Navigate to feature's scenarios page
- [ ] See seed scenarios
- [ ] Search by name works
- [ ] Priority filter works
- [ ] Tags displayed correctly

#### Create Scenario
- [ ] Click "New Scenario"
- [ ] Fill basic info (name, description, priority, tags)
- [ ] Add variables (optional)
- [ ] Save creates scenario
- [ ] Scenario appears in list

#### Duplicate Scenario
- [ ] Click duplicate icon on scenario
- [ ] New scenario created with "(복사본)" suffix
- [ ] Steps copied correctly
- [ ] Variables copied correctly

#### Delete Scenario
- [ ] Delete scenario
- [ ] Confirmation shown
- [ ] Scenario removed

---

### Scenario Editor (Priority: Critical)

#### Basic Navigation
- [ ] Open scenario editor
- [ ] See scenario details on left
- [ ] See steps list on right
- [ ] No console errors

#### Add Steps
- [ ] Click "Add Step" dropdown
- [ ] See all step types (navigate, click, fill, wait, assert, api-request, api-assert, component, script)
- [ ] Add "navigate" step
- [ ] Add "click" step with locator
- [ ] Add "fill" step with value
- [ ] Steps appear in list

#### Locator Configuration (Multi-Layer)
- [ ] Add step with locator (e.g., click)
- [ ] See "Add Locator Strategy" button
- [ ] Add testId strategy
- [ ] Add role strategy
- [ ] Add text strategy
- [ ] Add label strategy
- [ ] Add css strategy
- [ ] Add xpath strategy
- [ ] Set priority for each strategy
- [ ] Remove strategy works
- [ ] Reorder strategies (drag-drop if implemented)

#### Self-Healing Configuration
- [ ] In locator config, see healing section
- [ ] Toggle "Enable Healing" checkbox
- [ ] Toggle "Auto Approve" checkbox
- [ ] Adjust confidence threshold slider (0.7-1.0)
- [ ] Values save correctly

#### Step Reordering
- [ ] Drag and drop steps (if implemented)
- [ ] Or use up/down arrows
- [ ] Order persists after save

#### Save Scenario
- [ ] Make changes to steps
- [ ] Click "Save" button
- [ ] Success notification shown
- [ ] Refresh page, changes persisted

---

### Components (Reusable Flows) (Priority: High)

#### List Components
- [ ] Navigate to /components
- [ ] See seed component: "User Login"
- [ ] Search works

#### Create Component
- [ ] Click "New Component"
- [ ] Fill name, description, type
- [ ] Add parameters (name, type, required, description)
- [ ] Add steps (same as scenario steps)
- [ ] Save creates component

#### Use Component in Scenario
- [ ] In scenario editor, add "component" step
- [ ] Select component from dropdown
- [ ] See parameter inputs
- [ ] Bind parameters to variables (e.g., `{{userEmail}}`)
- [ ] Save scenario
- [ ] Component step visible in steps list

#### Edit Component
- [ ] Edit existing component
- [ ] Update parameters
- [ ] Update steps
- [ ] Save persists changes

#### Delete Component
- [ ] Delete component with no usage: succeeds
- [ ] Try to delete component used in scenarios: shows error or warning

---

### Test Execution (Priority: Critical)

#### Run Single Scenario
- [ ] Go to scenario detail page
- [ ] Click "Run" button
- [ ] See real-time execution (SSE)
- [ ] Step-by-step progress shown
- [ ] Each step shows: pending → running → passed/failed
- [ ] Execution completes
- [ ] Final status shown (passed/failed)

#### View Test Run Results
- [ ] Navigate to /runs
- [ ] See list of test runs
- [ ] Search by scenario name works
- [ ] Status filter (All/Passed/Failed/Running) works
- [ ] Date filter works
- [ ] Click on run to see details

#### Test Run Detail Page
- [ ] See run metadata (scenario, start/end time, duration, status)
- [ ] See step results list
- [ ] Each step shows: name, status, duration, error (if failed)
- [ ] Click on step to see detailed logs (if implemented)
- [ ] Screenshots visible (if captured)

#### Screenshot Capture
- [ ] Run scenario that captures screenshots
- [ ] Screenshots saved to `screenshots/` directory
- [ ] Screenshots accessible via `/api/screenshots/:filename`
- [ ] Screenshots displayed in test run results

---

### Self-Healing Dashboard (Priority: High)

#### View Healing Records
- [ ] Navigate to /healing
- [ ] See stats cards: Total, Pending, Approved, Rejected
- [ ] See healing records list (if any exist)

#### Filters and Search
- [ ] Use status filter dropdown (All/Pending/Approved/Rejected)
- [ ] Search by locator display name
- [ ] Combined filter + search works

#### Healing Record Details
- [ ] See locator display name
- [ ] See status badge (color-coded)
- [ ] See trigger reason badge
- [ ] See original → healed strategy change
- [ ] See confidence score with progress bar (color: green 90+, yellow 70-89, red <70)
- [ ] Expand accordion to see full details

#### Approve Healing
- [ ] Click "Approve" on pending record
- [ ] Record status changes to "approved"
- [ ] Success notification shown

#### Reject Healing
- [ ] Click "Reject" on pending record
- [ ] Record status changes to "rejected"
- [ ] Success notification shown

#### Approve All
- [ ] Click "Approve All Pending" button
- [ ] All pending records approved
- [ ] Stats updated

#### Propagate Healing
- [ ] Click "Propagate" on approved healing record
- [ ] System finds other scenarios with same displayName
- [ ] Healed strategy applied to those scenarios (priority: 1)
- [ ] Success message shows count of propagated scenarios

---

### Element Registry (Priority: Medium)

#### View Registry
- [ ] Navigate to /registry
- [ ] See list of tracked elements across scenarios
- [ ] Each entry shows: display name, strategies count, scenarios using it

#### Search Registry
- [ ] Search by element display name
- [ ] Search results update

#### View Element History (if implemented)
- [ ] Click on registry entry
- [ ] See history of changes for that element
- [ ] See which scenarios use it

---

### API Testing Features (Priority: High)

#### API Request Step
- [ ] Create scenario with "api-request" step
- [ ] Configure: method (GET/POST/PUT/DELETE), url, headers, body
- [ ] Save response as variable (e.g., `apiResponse`)
- [ ] Run scenario
- [ ] API request executed
- [ ] Response saved

#### API Assert Step
- [ ] Add "api-assert" step after api-request
- [ ] Assert status code (e.g., 200)
- [ ] Run scenario, assertion passes
- [ ] Try wrong status, assertion fails

#### API Assert Body
- [ ] Add api-assert with type: "body"
- [ ] Use JSON path (e.g., `data.id`)
- [ ] Use operator (exists, equals, contains, gt, lt)
- [ ] Run scenario, assertion evaluated correctly

---

## Edge Cases & Error Handling

### Validation Errors
- [ ] Try to create service without name → error shown
- [ ] Try to create service without URL → error shown
- [ ] Try to create feature without service → error shown
- [ ] Try invalid priority value → error shown

### Network Errors
- [ ] Stop backend server
- [ ] Try any frontend action
- [ ] User-friendly error message shown (not raw stack trace)
- [ ] Restart backend, app recovers

### Database Errors
- [ ] Delete database file while server running
- [ ] Try any action
- [ ] Error logged, user notified

### Empty States
- [ ] View services page with no services
- [ ] Appropriate empty state message shown
- [ ] Same for features, scenarios, components, runs, healing

### Long-Running Tests
- [ ] Run scenario with long `wait` step (e.g., 30 seconds)
- [ ] SSE heartbeat keeps connection alive
- [ ] No timeout error

---

## Performance & UX

### Page Load Times
- [ ] All pages load in <2 seconds
- [ ] No visible layout shift (CLS)

### Search & Filter Performance
- [ ] Search updates instantly (<300ms)
- [ ] Filters apply without page reload
- [ ] Large lists (100+ items) scroll smoothly

### Real-Time Updates (SSE)
- [ ] Test execution updates appear <1 second after event
- [ ] No duplicate events
- [ ] Connection auto-recovers on disconnect

### UI Responsiveness
- [ ] Buttons show loading state during API calls
- [ ] Forms disable during submission
- [ ] No "double submit" issues

---

## Browser Compatibility

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Responsive (if applicable)
- [ ] Layout adapts to mobile viewport
- [ ] Buttons/forms usable on touch
- [ ] No horizontal scroll

---

## Accessibility

### Keyboard Navigation
- [ ] Tab through forms
- [ ] Enter submits forms
- [ ] Escape closes modals

### Screen Reader (Basic)
- [ ] Buttons have aria-labels
- [ ] Forms have labels
- [ ] Error messages announced

---

## Known Issues / Limitations

Document any bugs found during QA:

### Bugs
- [ ] Bug #1: [Description]
- [ ] Bug #2: [Description]

### Limitations
- [ ] Component usage tracking is O(n) scan (no dedicated DB table)
- [ ] Only 62 lint warnings remaining (DuckDB/Playwright APIs)
- [ ] No drag-drop for step reordering yet (future feature)

---

## Sign-Off

### QA Engineer
- **Name:** _______________
- **Date:** _______________
- **Status:** ✅ Pass / ❌ Fail / ⚠️ Pass with Issues

### Notes:
_[Additional observations, recommendations, or blockers]_

---

## Next Steps After QA

1. **If Pass:** Proceed to internal alpha release
2. **If Fail:** Fix critical bugs, re-run QA
3. **If Pass with Issues:** Document issues in GitHub, prioritize for next sprint

---

## Quick Start Commands

```bash
# Fresh start (reset DB + seed)
rm packages/server/testforge.duckdb
bun run db:migrate
bun run db:seed

# Run servers
bun run dev

# Run tests
bun test

# Type check
bun run typecheck

# Lint
bun run lint

# Build
bun run build
```
