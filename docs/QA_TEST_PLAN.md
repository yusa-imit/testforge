# TestForge - Manual QA Test Plan

> **Version**: 1.0
> **Date**: 2026-02-16
> **Target**: MVP (98% Complete)
> **Purpose**: Verify all features work end-to-end before internal alpha release

---

## 📋 Test Environment Setup

### Prerequisites
```bash
# 1. Ensure Bun is installed
~/.bun/bin/bun --version

# 2. Install Playwright browsers
~/.bun/bin/bunx playwright install chromium

# 3. Install dependencies
~/.bun/bin/bun install

# 4. Run database migrations
~/.bun/bin/bun run db:migrate

# 5. Load seed data
~/.bun/bin/bun run scripts/seed.ts

# 6. Start development servers
~/.bun/bin/bun scripts/dev.ts
```

### Verify Environment
- ✅ Backend API running at: `http://localhost:3001`
- ✅ Frontend Web running at: `http://localhost:3000`
- ✅ Browser opens and displays TestForge dashboard

---

## 🧪 Test Suites

### Test Suite 1: Basic CRUD Operations

**Objective**: Verify create, read, update, delete operations for all entities

#### Test 1.1: Service Management
- [ ] **Create Service**
  1. Navigate to `/services`
  2. Click "+ New Service" button
  3. Fill in:
     - Name: "QA Test Service"
     - Description: "Test service for QA"
     - Base URL: "http://localhost:8080"
     - Default Timeout: 30000
  4. Click "Save"
  5. ✅ **Expected**: Service appears in list

- [ ] **View Service**
  1. Click on "QA Test Service" from list
  2. ✅ **Expected**: Service detail page loads with features list

- [ ] **Edit Service**
  1. Click "Edit" button
  2. Change name to "QA Test Service (Updated)"
  3. Click "Save"
  4. ✅ **Expected**: Name updated in UI

- [ ] **Delete Service**
  1. Click "Delete" button
  2. Confirm deletion
  3. ✅ **Expected**: Service removed from list

#### Test 1.2: Feature Management
- [ ] **Create Feature**
  1. Navigate to existing service (from seed data)
  2. Click "+ New Feature"
  3. Fill in:
     - Name: "QA Test Feature"
     - Description: "Test feature for QA"
  4. Click "Save"
  5. ✅ **Expected**: Feature appears in list

- [ ] **Edit Feature**
  1. Click "Edit" on feature
  2. Update description
  3. Click "Save"
  4. ✅ **Expected**: Changes saved

- [ ] **Delete Feature**
  1. Click "Delete" on feature
  2. Confirm deletion
  3. ✅ **Expected**: Feature removed

#### Test 1.3: Scenario Management
- [ ] **Create Scenario**
  1. Navigate to a feature
  2. Click "+ New Scenario"
  3. Fill in:
     - Name: "QA Login Test"
     - Description: "Test login functionality"
     - Priority: "High"
     - Tags: "smoke", "regression"
  4. Click "Save"
  5. ✅ **Expected**: Scenario created and editor opens

- [ ] **Add Variables**
  1. In scenario editor, click "Add Variable"
  2. Add variable:
     - Name: "testEmail"
     - Type: "string"
     - Default: "test@example.com"
  3. Click "Save"
  4. ✅ **Expected**: Variable appears in list

- [ ] **Duplicate Scenario**
  1. From scenario list, click "Duplicate" icon
  2. ✅ **Expected**: Copy created with "(Copy)" suffix

- [ ] **Delete Scenario**
  1. Click "Delete" button
  2. Confirm deletion
  3. ✅ **Expected**: Scenario removed

---

### Test Suite 2: Scenario Editor & Steps

**Objective**: Verify step creation, editing, and configuration

#### Test 2.1: Add Different Step Types
- [ ] **Navigate Step**
  1. Open scenario editor
  2. Click "Add Step" → "Navigate"
  3. Configure:
     - Description: "Go to login page"
     - URL: "/login"
  4. Save step
  5. ✅ **Expected**: Navigate step appears in list

- [ ] **Click Step with Multi-Layer Locator**
  1. Add "Click" step
  2. Configure locator strategies:
     - **Strategy 1 (Priority 1)**: testId = "login-button"
     - **Strategy 2 (Priority 2)**: role = "button", name = "Login"
     - **Strategy 3 (Priority 3)**: text = "Login", exact = true
  3. Enable Self-Healing
  4. Set auto-approve threshold: 0.9
  5. Save step
  6. ✅ **Expected**: Click step with 3 strategies created

- [ ] **Fill Step**
  1. Add "Fill" step
  2. Configure:
     - Description: "Enter email"
     - Locator: testId = "email-input"
     - Value: "{{testEmail}}" (use variable)
  3. Save step
  4. ✅ **Expected**: Fill step with variable reference created

- [ ] **Assert Step**
  1. Add "Assert" step
  2. Configure:
     - Type: "visible"
     - Locator: testId = "dashboard-header"
  3. Save step
  4. ✅ **Expected**: Assert step created

- [ ] **Screenshot Step**
  1. Add "Screenshot" step
  2. Configure:
     - Name: "after-login"
     - Full page: true
  3. Save step
  4. ✅ **Expected**: Screenshot step created

- [ ] **API Request Step**
  1. Add "API Request" step
  2. Configure:
     - Method: GET
     - URL: https://jsonplaceholder.typicode.com/posts/1
     - Save response as: "post"
  3. Save step
  4. ✅ **Expected**: API request step created

- [ ] **API Assert Step**
  1. Add "API Assert" step
  2. Configure:
     - Type: "body"
     - Path: "userId"
     - Expected: 1
     - Operator: "equals"
  3. Save step
  4. ✅ **Expected**: API assert step created

- [ ] **Script Step** ✨ (Recently verified implemented)
  1. Add "Script" step
  2. Configure:
     - Code: `return document.title;`
     - Save result as: "pageTitle"
  3. Save step
  4. ✅ **Expected**: Script step created

#### Test 2.2: Step Reordering
- [ ] **Drag and Drop**
  1. Create 3+ steps
  2. Drag step 3 to position 1
  3. ✅ **Expected**: Steps reorder correctly

- [ ] **Delete Step**
  1. Click delete icon on a step
  2. Confirm deletion
  3. ✅ **Expected**: Step removed from list

---

### Test Suite 3: Test Execution

**Objective**: Verify test execution works with real browser automation

#### Test 3.1: Execute Simple Scenario
- [ ] **Run from Seed Data**
  1. Navigate to "E-commerce Platform" service
  2. Open "Shopping Cart" feature
  3. Select "Add item to cart" scenario
  4. Click "▶ Run" button
  5. ✅ **Expected**:
     - Run starts immediately
     - Status changes to "Running"
     - Redirected to RunDetail page

- [ ] **View Real-time Updates**
  1. While test is running, observe RunDetail page
  2. ✅ **Expected**:
     - Step-by-step progress displays in real-time
     - "Step X of Y" indicator updates
     - Step statuses appear (pending → running → passed/failed)
     - Duration timer increments

- [ ] **Check Final Results**
  1. Wait for test completion
  2. ✅ **Expected**:
     - Final status shows (Passed/Failed)
     - Total duration displayed
     - Summary stats correct:
       - Total steps
       - Passed steps
       - Failed steps
       - Healed steps (if any)

- [ ] **View Step Details**
  1. Click on individual steps to expand
  2. ✅ **Expected**:
     - Step configuration visible
     - Duration shown
     - Error messages (if failed)
     - Screenshot (if captured)

#### Test 3.2: Execute Scenario with API Steps
- [ ] **Create API Test Scenario**
  1. Create new scenario "API Test"
  2. Add steps:
     - API Request (GET https://jsonplaceholder.typicode.com/posts/1)
     - API Assert (status = 200)
     - API Assert (body path "userId" = 1)
     - API Assert (body path "id" = 1)
  3. Save scenario

- [ ] **Run API Test**
  1. Click "▶ Run"
  2. ✅ **Expected**:
     - All API steps execute successfully
     - Response data captured
     - Assertions pass
     - Console logs show API request details

---

### Test Suite 4: Self-Healing System

**Objective**: Verify Self-Healing detection, recording, and approval workflow

#### Test 4.1: Trigger Self-Healing
- [ ] **Create Scenario with Broken Selector**
  1. Create scenario "Healing Test"
  2. Add click step with:
     - **Strategy 1**: testId = "nonexistent-button" (will fail)
     - **Strategy 2**: role = "button", name = "Login" (will work)
     - **Strategy 3**: text = "Login"
  3. Enable Self-Healing
  4. Save scenario

- [ ] **Execute and Trigger Healing**
  1. Run scenario
  2. ✅ **Expected**:
     - testId strategy fails
     - role strategy succeeds
     - Step status shows "Healed" ⚠️
     - Healing info displays:
       - Original strategy: testId
       - Used strategy: role
       - Confidence: ~0.9 (90%)

- [ ] **Verify Healing Record Created**
  1. Navigate to `/healing`
  2. ✅ **Expected**:
     - New healing record appears in "Pending" section
     - Record shows:
       - Locator name
       - Scenario name
       - Strategy change (testId → role)
       - Confidence score with color coding
       - Timestamp

#### Test 4.2: Healing Approval Workflow
- [ ] **Review Healing Record**
  1. On healing dashboard, click on pending record
  2. Expand accordion to view details
  3. ✅ **Expected**:
     - Full strategy JSON visible
     - Link to scenario
     - Link to test run
     - Confidence bar with appropriate color:
       - Green (≥90%)
       - Yellow (70-89%)
       - Red (<70%)

- [ ] **Approve Healing**
  1. Click "✅ Approve" button
  2. ✅ **Expected**:
     - Status changes to "Approved"
     - Record moves to "Approved" section
     - Success toast notification

- [ ] **Verify Healing Applied**
  1. Re-run the same scenario
  2. ✅ **Expected**:
     - Healed strategy (role) now used as primary
     - No healing occurs (strategy already optimal)
     - Step passes normally without "Healed" status

- [ ] **Test Reject Workflow**
  1. Create another scenario with healing
  2. Navigate to healing dashboard
  3. Click "❌ Reject" on the new record
  4. ✅ **Expected**:
     - Status changes to "Rejected"
     - Next run still uses original strategy
     - Healing occurs again

#### Test 4.3: Auto-Approval
- [ ] **Test High Confidence Auto-Approval**
  1. Create scenario with healing (confidence ≥ 0.9)
  2. Run scenario
  3. Navigate to `/healing`
  4. ✅ **Expected**:
     - Record shows status "Auto-Approved" ✅
     - No manual approval needed
     - Applied automatically to next run

#### Test 4.4: Healing Propagation
- [ ] **Propagate to Other Scenarios**
  1. Find an approved healing record
  2. Click "Propagate" button
  3. ✅ **Expected**:
     - Modal shows scenarios using same element
     - Confirmation prompt
     - Healed strategy applied to all listed scenarios
     - Toast shows "Propagated to X scenarios"

---

### Test Suite 5: Component System

**Objective**: Verify reusable component creation and usage

#### Test 5.1: Create Reusable Component
- [ ] **Create Login Component**
  1. Navigate to `/components`
  2. Click "+ New Component"
  3. Configure:
     - Name: "User Login Flow"
     - Type: "flow"
     - Description: "Reusable login steps"
  4. Add parameters:
     - email (string, required)
     - password (string, required)
  5. Add steps:
     - Navigate to /login
     - Fill email field with {{email}}
     - Fill password field with {{password}}
     - Click login button
  6. Save component
  7. ✅ **Expected**: Component created and listed

#### Test 5.2: Use Component in Scenario
- [ ] **Reference Component**
  1. Create new scenario
  2. Add "Component" step
  3. Select "User Login Flow" component
  4. Provide parameter values:
     - email: "admin@test.com"
     - password: "password123"
  5. Save scenario
  6. ✅ **Expected**: Component step created with parameters

- [ ] **Execute Scenario with Component**
  1. Run scenario
  2. ✅ **Expected**:
     - Component expands to individual steps during execution
     - Parameter values substituted correctly
     - All component steps execute in order
     - Execution succeeds

#### Test 5.3: Component Usage Tracking
- [ ] **View Component Usages**
  1. Navigate to `/components`
  2. Click on "User Login Flow" component
  3. Look for "Used in X scenarios" section
  4. ✅ **Expected**:
     - List of scenarios using this component
     - Accurate count

  **Note**: This API exists but needs verification. If not working, this is a known issue to fix.

---

### Test Suite 6: Search & Filtering

**Objective**: Verify search and filter functionality across all pages

#### Test 6.1: Services Page
- [ ] **Search Services**
  1. Navigate to `/services`
  2. Type "E-commerce" in search box
  3. ✅ **Expected**:
     - Results filter in real-time
     - Only matching services shown
     - Result count updates

- [ ] **Clear Search**
  1. Clear search box
  2. ✅ **Expected**: All services visible again

#### Test 6.2: Features/Scenarios Page
- [ ] **Search Scenarios**
  1. Navigate to a feature detail page
  2. Type scenario name in search box
  3. ✅ **Expected**: Filtered results

- [ ] **Filter by Priority**
  1. Select "High" from priority filter
  2. ✅ **Expected**: Only high-priority scenarios shown

- [ ] **Filter by Tags**
  1. Search for tag name
  2. ✅ **Expected**: Scenarios with matching tags shown

#### Test 6.3: Runs Page
- [ ] **Filter by Status**
  1. Navigate to `/runs`
  2. Select "Passed" from status filter
  3. ✅ **Expected**: Only passed runs shown

- [ ] **Filter by Date Range**
  1. Select "Last 7 days"
  2. ✅ **Expected**: Only recent runs shown

- [ ] **Combined Filters**
  1. Apply status filter + date filter + search
  2. ✅ **Expected**: All filters work together

#### Test 6.4: Healing Page
- [ ] **Filter by Status**
  1. Navigate to `/healing`
  2. Select "Pending" from status dropdown
  3. ✅ **Expected**: Only pending healing records shown

- [ ] **Search Healing Records**
  1. Type element name in search box
  2. ✅ **Expected**: Matching records appear

---

### Test Suite 7: Element Registry

**Objective**: Verify element tracking and history

#### Test 7.1: View Element Registry
- [ ] **Navigate to Registry**
  1. Go to `/registry`
  2. ✅ **Expected**:
     - Element registry page loads
     - List of tracked elements shown
     - Stats cards display counts

- [ ] **Filter by Service**
  1. Select service from dropdown
  2. ✅ **Expected**: Elements filtered by service

- [ ] **Search Elements**
  1. Type element name in search box
  2. ✅ **Expected**: Matching elements appear

#### Test 7.2: Element Details
- [ ] **View Element History**
  1. Click on an element
  2. ✅ **Expected**:
     - Element details displayed
     - Change history shown
     - Timestamps for each change

- [ ] **View Element Usage**
  1. Look at "Used in" section
  2. ✅ **Expected**:
     - List of scenarios using this element
     - Links to scenarios work

---

### Test Suite 8: Error Handling & Edge Cases

**Objective**: Verify graceful error handling and edge case coverage

#### Test 8.1: Validation Errors
- [ ] **Create Service with Missing Fields**
  1. Try to create service without name
  2. ✅ **Expected**: Validation error message

- [ ] **Invalid URL**
  1. Enter invalid URL in base URL field
  2. ✅ **Expected**: Validation error

#### Test 8.2: Execution Errors
- [ ] **Element Not Found**
  1. Create scenario with non-existent element (no fallbacks)
  2. Run scenario
  3. ✅ **Expected**:
     - Step fails with clear error message
     - Error details in step result
     - Screenshot captured at failure point

- [ ] **Timeout**
  1. Create step with very short timeout (100ms)
  2. Run scenario
  3. ✅ **Expected**:
     - Timeout error message
     - Execution stops gracefully

#### Test 8.3: API Errors
- [ ] **API Request Failure**
  1. Create API request to invalid URL
  2. Run scenario
  3. ✅ **Expected**:
     - Network error captured
     - Step marked as failed
     - Error message clear

- [ ] **API Assertion Failure**
  1. Create assertion that will fail
  2. Run scenario
  3. ✅ **Expected**:
     - Assertion error message
     - Expected vs actual values shown

---

## 📊 Test Results Summary

### Completion Checklist
- [ ] **Test Suite 1**: Basic CRUD (9 tests)
- [ ] **Test Suite 2**: Scenario Editor (10 tests)
- [ ] **Test Suite 3**: Test Execution (7 tests)
- [ ] **Test Suite 4**: Self-Healing (11 tests)
- [ ] **Test Suite 5**: Components (6 tests)
- [ ] **Test Suite 6**: Search & Filtering (11 tests)
- [ ] **Test Suite 7**: Element Registry (6 tests)
- [ ] **Test Suite 8**: Error Handling (7 tests)

**Total Tests**: 67

### Pass/Fail Tracking
| Suite | Total | Passed | Failed | Blocked |
|-------|-------|--------|--------|---------|
| 1. CRUD | 9 | | | |
| 2. Editor | 10 | | | |
| 3. Execution | 7 | | | |
| 4. Self-Healing | 11 | | | |
| 5. Components | 6 | | | |
| 6. Search | 11 | | | |
| 7. Registry | 6 | | | |
| 8. Errors | 7 | | | |
| **TOTAL** | **67** | **0** | **0** | **0** |

---

## 🐛 Bug Report Template

When you find a bug, document it using this format:

```markdown
### Bug #X: [Short Description]

**Severity**: Critical / High / Medium / Low
**Test Suite**: [Suite name and test number]
**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Result**:
[What should happen]

**Actual Result**:
[What actually happened]

**Screenshots/Logs**:
[Attach if available]

**Environment**:
- Browser: Chrome/Firefox/Safari
- OS: macOS/Windows/Linux
- TestForge Version: 0.1.0

**Workaround** (if any):
[Temporary fix]
```

---

## ✅ Sign-Off Criteria

QA is considered **PASSED** when:
- [ ] All 67 tests executed
- [ ] Pass rate ≥ 95% (≤3 failures allowed)
- [ ] No **Critical** severity bugs
- [ ] No more than 2 **High** severity bugs
- [ ] All blockers resolved or documented

QA is considered **FAILED** when:
- [ ] Pass rate < 95%
- [ ] Any Critical bugs found
- [ ] More than 5 High severity bugs
- [ ] Core functionality broken (CRUD, execution, Self-Healing)

---

## 📋 Next Steps After QA

### If QA Passes
1. Update PROJECT_STATUS.md to 100% complete
2. Create release notes for v0.1.0 internal alpha
3. Deploy to internal testing environment
4. Announce to team for dogfooding
5. Gather feedback for v0.2.0 planning

### If QA Fails
1. Prioritize bugs by severity
2. Fix Critical and High bugs immediately
3. Document Medium/Low bugs for backlog
4. Re-run failed test cases
5. Update documentation with known issues

---

## 📞 Support

For questions about this test plan:
- Review `docs/PRD.md` for requirements
- Check `docs/USER_GUIDE.md` for feature documentation
- Consult `docs/CURRENT_STATUS.md` for project status

---

**Created**: 2026-02-16
**Last Updated**: 2026-02-16
**Version**: 1.0
**Owner**: QA Team
