# TestForge - Implementation Plan

> **Remaining Work to Reach 100% MVP**
> **Estimated Total Time**: 2-3 days

---

## 🎯 Goals

1. **Test & Verify** - Ensure all existing features work correctly
2. **Complete MVP** - Implement remaining 15% of features
3. **QA Ready** - System is stable and testable

---

## Phase 1: Testing & Verification (Day 1, Morning)

### 1.1 Run Seed Script ✅ **COMPLETED**
**Time**: 10 minutes
**Status**: Seed script created at `scripts/seed.ts`

**Test**:
```bash
bun run db:migrate  # Ensure DB is ready
bun run db:seed     # Load sample data
```

**Expected Output**:
- 2 Services created
- 3 Features created
- 4 Scenarios created
- 1 Component created

**Verification**:
- Open http://localhost:3000
- Navigate to Services page
- Verify "E-commerce Platform" and "Admin Portal" appear
- Click into each service and verify features are listed

---

### 1.2 Manual QA - Core Features
**Time**: 2-3 hours

#### Test 1: Create Service Flow
1. Click "+ New Service"
2. Fill in form:
   - Name: "Test Service"
   - Base URL: "http://localhost:8080"
   - Default Timeout: 30000
3. Click "Create Service"
4. **Verify**: Service appears in list
5. Click on service
6. **Verify**: Service detail page loads

#### Test 2: Create Feature & Scenario
1. In service detail, click "+ New Feature"
2. Create feature "Test Feature"
3. Click on feature
4. Click "+ New Scenario"
5. Add scenario "Test Login":
   - Add variable: email (string, "test@example.com")
   - Add step: Navigate to "/login"
   - Add step: Fill email input
   - Add step: Click login button
6. **Verify**: Scenario saves successfully

#### Test 3: Execute Scenario
1. Open a scenario (e.g., "Add Item to Cart" from seed data)
2. Click "▶️ Run" button
3. **Verify**:
   - Run starts (status: running)
   - Real-time updates appear (SSE working)
   - Steps execute one by one
   - Final status: passed or failed
4. Click on run result
5. **Verify**: Step results displayed with details

#### Test 4: Self-Healing Workflow
1. Create a simple scenario with a button click
2. Use a testId that doesn't exist, but add fallback strategies
3. Run the scenario
4. **Verify**:
   - Healing occurs (testId fails, role succeeds)
   - Healing record created
5. Navigate to Healing dashboard
6. **Verify**:
   - New healing record appears
   - Status: "pending" or "auto_approved"
7. Click "Approve" on pending record
8. **Verify**: Status changes to "approved"

#### Test 5: Component Reuse
1. Navigate to Components page
2. Click on "User Login" component (from seed)
3. **Verify**: Component editor shows parameters and steps
4. Create a new scenario
5. Add step: Component → "User Login"
6. Provide parameters: email, password
7. Save scenario
8. Run scenario
9. **Verify**: Component steps execute correctly

#### Test 6: API Testing
1. Create scenario "API Test"
2. Add step: api-request
   - Method: GET
   - URL: "https://jsonplaceholder.typicode.com/posts/1"
   - Save as: "post"
3. Add step: api-assert
   - Type: status
   - Status: 200
4. Add step: api-assert
   - Type: body
   - Path: "userId"
   - Expected: 1
5. Run scenario
6. **Verify**: All assertions pass

---

### 1.3 Bug Triage
**Time**: 1 hour

**For each bug found**:
1. Document:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Severity: Critical / High / Medium / Low
2. Prioritize critical and high severity bugs
3. Fix immediately if blocking

---

## Phase 2: Complete Missing Features (Day 1, Afternoon + Day 2)

### 2.1 Add Search & Filtering (High Priority)
**Time**: 3-4 hours
**Files to modify**:
- `packages/web/src/pages/Services.tsx`
- `packages/web/src/pages/FeatureDetail.tsx` (scenarios list)
- `packages/web/src/pages/Runs.tsx`

#### Services Page Search
**Implementation**:
```tsx
// Add state
const [searchQuery, setSearchQuery] = useState("");

// Filter services
const filteredServices = services?.filter(s =>
  s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
  s.description?.toLowerCase().includes(searchQuery.toLowerCase())
);

// Add UI
<Input
  placeholder="Search services..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
/>
```

#### Scenarios List - Tag & Priority Filters
**Implementation**:
```tsx
// Add state
const [selectedTags, setSelectedTags] = useState<string[]>([]);
const [selectedPriority, setSelectedPriority] = useState<string>("all");

// Filter scenarios
const filteredScenarios = scenarios?.filter(s => {
  const tagMatch = selectedTags.length === 0 ||
    selectedTags.some(tag => s.tags.includes(tag));
  const priorityMatch = selectedPriority === "all" ||
    s.priority === selectedPriority;
  return tagMatch && priorityMatch;
});

// Add UI
<Select value={selectedPriority} onValueChange={setSelectedPriority}>
  <option value="all">All Priorities</option>
  <option value="critical">Critical</option>
  <option value="high">High</option>
  <option value="medium">Medium</option>
  <option value="low">Low</option>
</Select>
```

#### Runs Page - Status & Date Filters
**Implementation**:
```tsx
// Add state
const [statusFilter, setStatusFilter] = useState<string>("all");
const [dateFilter, setDateFilter] = useState<string>("7d"); // 7 days

// Filter runs
const filteredRuns = runs?.filter(r => {
  const statusMatch = statusFilter === "all" || r.status === statusFilter;
  const dateMatch = // implement date filtering
  return statusMatch && dateMatch;
});

// Add UI
<DropdownMenu>
  <DropdownMenuTrigger>Filter by Status</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => setStatusFilter("all")}>
      All
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setStatusFilter("passed")}>
      Passed
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setStatusFilter("failed")}>
      Failed
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

### 2.2 Implement Element Registry (Medium Priority)
**Time**: 2-3 hours
**PRD Reference**: Section 3.3

#### Step 1: Update Database Schema
**File**: `packages/server/src/db/schema.ts`

Add table:
```typescript
export const elementRegistryTable = `
  CREATE TABLE IF NOT EXISTS element_registry (
    id VARCHAR PRIMARY KEY,
    service_id VARCHAR NOT NULL,
    display_name VARCHAR NOT NULL,
    page_pattern VARCHAR,
    current_locator JSON NOT NULL,
    history JSON DEFAULT '[]',
    used_in JSON DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
  )
`;
```

Add to migrations:
```typescript
export const allTables = [
  // ... existing tables
  elementRegistryTable,
];
```

Add index:
```typescript
'CREATE INDEX IF NOT EXISTS idx_element_registry_service_id ON element_registry(service_id)',
'CREATE INDEX IF NOT EXISTS idx_element_registry_display_name ON element_registry(display_name)',
```

#### Step 2: Create API Routes
**File**: `packages/server/src/routes/registry.ts`

```typescript
import { Hono } from "hono";
import { getDB } from "../db";

const app = new Hono()
  // GET /api/registry - List all elements for a service
  .get("/", async (c) => {
    const serviceId = c.req.query("serviceId");
    const db = await getDB();
    // Implement: SELECT * FROM element_registry WHERE service_id = ?
  })

  // GET /api/registry/:id - Get element details
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    // Implement: SELECT * FROM element_registry WHERE id = ?
  })

  // PUT /api/registry/:id - Update element locator
  .put("/:id", async (c) => {
    const id = c.req.param("id");
    const data = await c.req.json();
    // Implement: Update element + add to history
  });

export default app;
```

#### Step 3: Track Element Usage
When healing occurs, update element registry:
1. Check if element exists in registry (by displayName)
2. If not, create new entry
3. If yes, add healing to history
4. Track which scenarios use this element

#### Step 4: UI for Element Registry (Optional)
**File**: `packages/web/src/pages/ElementRegistry.tsx`

Create new page to:
- List all registered elements
- Show usage count per element
- Display healing history
- Link to scenarios using each element

---

### 2.3 Verify Component Usage Tracking (Low Priority)
**Time**: 30 minutes

**Test Existing API**:
```bash
# Create a component (use UI or API)
# Use component in 2-3 scenarios
# Call API
curl http://localhost:3001/api/components/{componentId}/usages

# Expected: JSON showing which scenarios use the component
```

**If broken**:
1. Check `packages/server/src/routes/components.ts`
2. Verify `GET /components/:id/usages` implementation
3. Fix query logic
4. Test again

---

## Phase 3: Final Polish (Day 3)

### 3.1 Documentation Updates
**Time**: 1 hour

Update these files with latest changes:
1. `README.md` - Add seed script instructions
2. `USER_GUIDE.md` - Add search/filtering usage
3. `docs/PROJECT_STATUS.md` - Mark features as complete

### 3.2 Create Deployment Guide (Optional)
**Time**: 1-2 hours
**File**: `docs/DEPLOYMENT.md`

Topics to cover:
- Environment setup (Bun, Playwright)
- Database initialization
- Configuration (base URLs, ports)
- Process management (systemd, PM2)
- Reverse proxy (nginx)
- SSL/HTTPS setup
- Backup strategy

---

## Priority Matrix

### Must Have (Blocking MVP)
1. ✅ Seed script - **COMPLETED**
2. 🟡 Manual QA - **IN PROGRESS**
3. 🔴 Fix critical bugs (if found)

### Should Have (Strong MVP)
4. 🟡 Search & filtering
5. 🟡 Element Registry

### Nice to Have (Can Defer)
6. ⚪ Component usage verification
7. ⚪ Deployment guide
8. ⚪ Element Registry UI page

---

## Testing Checklist

Before declaring MVP complete, verify:

- [ ] All seed data loads successfully
- [ ] Can create service/feature/scenario from UI
- [ ] Can execute a browser test scenario
- [ ] Can execute an API test scenario
- [ ] Self-Healing triggers on element not found
- [ ] Healing approval workflow works
- [ ] Components can be created and reused
- [ ] Real-time SSE updates work during execution
- [ ] Screenshots are captured and displayed
- [ ] Scenario duplication works
- [ ] Search works on main pages
- [ ] No TypeScript errors (`bun run typecheck`)
- [ ] No console errors in browser

---

## Risk Assessment

### Low Risk
- Search/filtering - Straightforward UI work
- Documentation updates - No code changes

### Medium Risk
- Element Registry - New feature, needs careful testing
- Manual QA - May uncover unexpected bugs

### High Risk
- None identified

---

## Timeline Summary

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| **Phase 1**: Testing | 0.5 days | QA report, bug list |
| **Phase 2**: Features | 1.5 days | Search, Element Registry |
| **Phase 3**: Polish | 0.5 days | Updated docs |
| **Total** | **2-3 days** | **100% MVP** |

---

## Next Actions (In Order)

1. ✅ **Run seed script** - Test sample data creation
2. **Start manual QA** - Follow test cases above
3. **Document bugs** - Create bug list with priorities
4. **Fix critical bugs** - Blockers first
5. **Implement search** - Services, Scenarios, Runs pages
6. **Implement Element Registry** - Database + API
7. **Final testing** - Complete checklist
8. **Update docs** - Reflect all changes

---

## Success Criteria

MVP is **100% complete** when:
- ✅ All seed data loads
- ✅ All manual test cases pass
- ✅ No critical or high severity bugs
- ✅ Search works on all main pages
- ✅ Element Registry tracking changes
- ✅ Documentation is up-to-date
- ✅ TypeScript compiles without errors

**Ship Target**: End of Day 3

---

**Created**: 2026-02-12
**Owner**: Development Team
**Status**: Ready to Execute
