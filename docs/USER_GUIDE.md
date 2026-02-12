# TestForge User Guide

> **Complete guide to using TestForge for automated testing**

This guide will teach you everything you need to know to create, manage, and execute automated tests with TestForge's Self-Healing technology.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Core Concepts](#core-concepts)
3. [Creating Your First Test](#creating-your-first-test)
4. [Understanding Services, Features & Scenarios](#understanding-services-features--scenarios)
5. [Working with Steps](#working-with-steps)
6. [Multi-Layer Locators & Self-Healing](#multi-layer-locators--self-healing)
7. [Variables & Dynamic Data](#variables--dynamic-data)
8. [Reusable Components](#reusable-components)
9. [API Testing](#api-testing)
10. [Running Tests](#running-tests)
11. [Managing Self-Healing](#managing-self-healing)
12. [Best Practices](#best-practices)
13. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Accessing TestForge

1. Open your browser and navigate to: **http://localhost:3000**
2. You'll see the **Dashboard** showing recent test runs and statistics

### Dashboard Overview

The dashboard displays:
- **24-hour statistics**: Total runs, success/failure rates
- **Self-Healing status**: Pending approvals
- **Recent failures**: Quick access to failed tests
- **Navigation**: Services, Components, Test Runs, Healing

---

## Core Concepts

### Hierarchical Test Organization

TestForge organizes tests in a 4-level hierarchy:

```
Service (Application under test)
  └─ Feature (Logical functionality)
      └─ Scenario (Test case)
          └─ Step (Individual action)
```

**Example:**
```
Service: "E-commerce Platform"
  └─ Feature: "Shopping Cart"
      └─ Scenario: "Add item to cart and checkout"
          ├─ Step 1: Navigate to product page
          ├─ Step 2: Click "Add to Cart"
          ├─ Step 3: Navigate to cart
          ├─ Step 4: Click "Checkout"
          └─ Step 5: Verify order summary
```

### Self-Healing Technology

When UI elements change (IDs, classes, text), TestForge automatically tries alternative ways to find them:

**Priority order:**
1. `data-testid` (most reliable)
2. ARIA role + name (semantic)
3. Text content (user-visible)
4. Label (for inputs)
5. CSS selector (structural)
6. XPath (last resort)

If the primary method fails, TestForge uses the next method and records the "healing" for your approval.

---

## Creating Your First Test

### Step 1: Create a Service

A **Service** represents the application you want to test.

1. Click **"+ New Service"** on the Dashboard
2. Fill in the form:
   - **Name**: "My Application"
   - **Description**: "Main web application"
   - **Base URL**: "https://myapp.com" (or "http://localhost:8080" for local)
   - **Default Timeout**: 30000ms (30 seconds)
3. Click **"Create Service"**

### Step 2: Create a Feature

A **Feature** is a logical part of your service.

1. Click on your service to open the detail page
2. Click **"+ New Feature"**
3. Fill in the form:
   - **Name**: "User Authentication"
   - **Description**: "Login, logout, password reset"
   - **Owners**: ["qa@myapp.com"] (optional)
4. Click **"Create Feature"**

### Step 3: Create a Scenario

A **Scenario** is your actual test case.

1. Click on your feature to open the detail page
2. Click **"+ New Scenario"**
3. Fill in the form:
   - **Name**: "User can log in successfully"
   - **Description**: "Tests the happy path for user login"
   - **Priority**: High
   - **Tags**: ["smoke", "authentication"]
4. Click **"Create Scenario"**

You'll be redirected to the **Scenario Editor**.

### Step 4: Add Variables (Optional)

Variables allow you to reuse values across steps.

1. In the **Variables** section, click **"+ Add Variable"**
2. Configure:
   - **Name**: `userEmail`
   - **Type**: String
   - **Default Value**: "test@example.com"
3. Add another variable:
   - **Name**: `userPassword`
   - **Type**: String
   - **Default Value**: "password123"

### Step 5: Add Steps

Now add the test steps. Click **"+ Add Step"** and create each step:

#### Step 1: Navigate to Login Page

- **Type**: Navigate
- **Description**: "Go to login page"
- **URL**: `/login`

#### Step 2: Fill Email Field

- **Type**: Fill
- **Description**: "Enter email address"
- **Locator**:
  - Strategy 1 (testId): `email-input`
  - Strategy 2 (label): "Email"
  - Strategy 3 (css): `input[type="email"]`
- **Value**: `{{userEmail}}` (uses variable)

#### Step 3: Fill Password Field

- **Type**: Fill
- **Description**: "Enter password"
- **Locator**:
  - Strategy 1 (testId): `password-input`
  - Strategy 2 (label): "Password"
- **Value**: `{{userPassword}}`

#### Step 4: Click Login Button

- **Type**: Click
- **Description**: "Submit login form"
- **Locator**:
  - Strategy 1 (testId): `login-button`
  - Strategy 2 (role): button, "Login"
  - Strategy 3 (text): "Login"

#### Step 5: Verify Success

- **Type**: Assert
- **Description**: "Verify user is logged in"
- **Assert Type**: URL
- **Expected**: `/dashboard`

### Step 6: Save and Run

1. Click **"Save"** to save your scenario
2. Click **"▶️ Run"** to execute the test
3. Watch the real-time execution on the Run Detail page

---

## Understanding Services, Features & Scenarios

### Services

**What it is**: The application or system under test.

**When to create**:
- One service per application/system
- Example: "Admin Dashboard", "Customer Portal", "Mobile API"

**Best practices**:
- Use descriptive names
- Set accurate base URLs
- Adjust timeout based on your app's performance

### Features

**What it is**: A logical grouping of related functionality.

**When to create**:
- Group by business capability, not technical implementation
- Example: "User Management", "Billing", "Reports"

**Best practices**:
- Keep features focused and cohesive
- Assign owners for accountability
- Document feature dependencies

### Scenarios

**What it is**: A single test case with a clear objective.

**When to create**:
- One scenario = one test goal
- Example: "User can reset password", "Admin can delete user"

**Best practices**:
- Use clear, action-oriented names
- Tag appropriately: `smoke`, `regression`, `critical`
- Set correct priority levels
- Keep scenarios focused (5-15 steps ideal)

---

## Working with Steps

### Available Step Types

| Type | Purpose | Example |
|------|---------|---------|
| **Navigate** | Go to a URL | Navigate to `/products` |
| **Click** | Click an element | Click "Add to Cart" button |
| **Fill** | Enter text | Fill email input with `user@example.com` |
| **Select** | Choose dropdown option | Select "United States" from country dropdown |
| **Hover** | Mouse hover | Hover over menu to reveal submenu |
| **Wait** | Pause or wait for condition | Wait 2 seconds or wait for element to appear |
| **Assert** | Verify expectations | Assert URL contains `/checkout` |
| **Screenshot** | Capture screenshot | Take screenshot for debugging |
| **API Request** | Make HTTP call | POST to `/api/users` |
| **API Assert** | Validate API response | Assert status code is 200 |
| **Component** | Reuse common flows | Execute "Admin Login" component |

### Creating a Step

1. Click **"+ Add Step"** in the Scenario Editor
2. Choose a step type
3. Configure the step:
   - **Description**: What this step does (for humans)
   - **Type-specific config**: Locator, value, URL, etc.
   - **Timeout** (optional): Override default timeout
   - **Continue on Error** (optional): Don't stop if this step fails

### Editing a Step

- Click the **⋮** menu on any step
- Select **"Edit"** to modify
- Select **"Delete"** to remove
- Drag the **≡** handle to reorder

---

## Multi-Layer Locators & Self-Healing

### Why Multi-Layer Locators?

Traditional tests break when:
- An element's ID changes
- Class names are refactored
- Text is updated

TestForge uses **multiple strategies** to find the same element, making tests resilient to change.

### Locator Strategy Types

#### 1. Test ID (Most Reliable)
```html
<button data-testid="submit-button">Submit</button>
```
- **Pro**: Explicit, stable, best practice
- **Con**: Requires developers to add test IDs
- **Confidence**: 100%

#### 2. ARIA Role (Semantic)
```html
<button role="button" aria-label="Submit form">Submit</button>
```
- **Pro**: Semantic, accessibility-friendly
- **Con**: Not always available
- **Confidence**: 95%

#### 3. Text Content (User-Visible)
```html
<button>Submit</button>
```
- **Pro**: User-visible, easy to verify
- **Con**: Breaks if text changes
- **Confidence**: 90%

#### 4. Label (For Inputs)
```html
<label>Email</label>
<input name="email" />
```
- **Pro**: User-visible, semantic
- **Con**: Input-specific
- **Confidence**: 90%

#### 5. CSS Selector (Structural)
```html
<button class="btn btn-primary">Submit</button>
```
- **Pro**: Flexible, powerful
- **Con**: Brittle, breaks with CSS changes
- **Confidence**: 80%

#### 6. XPath (Last Resort)
```html
//button[contains(@class, 'submit')]
```
- **Pro**: Very flexible
- **Con**: Hardest to maintain, slowest
- **Confidence**: 70%

### Setting Up Multi-Layer Locators

When editing a step that needs an element (Click, Fill, etc.):

1. In the **Locator** section, add multiple strategies
2. **Strategy 1** (highest priority): Use testId if available
3. **Strategy 2**: Use role or label
4. **Strategy 3**: Use text content
5. **Strategy 4** (fallback): Use CSS selector

**Example for a Submit Button:**
```
Strategy 1: testId = "submit-button"
Strategy 2: role = "button", name = "Submit"
Strategy 3: text = "Submit" (exact match)
Strategy 4: css = ".submit-btn"
```

### How Self-Healing Works

1. **Test runs**, tries Strategy 1 (testId)
2. **Element not found** (developer changed the ID)
3. **TestForge tries Strategy 2** (role)
4. **Element found!** ✅
5. **Healing record created** with 95% confidence
6. **Auto-approved** (if confidence > threshold) or awaits your approval
7. **Next run uses the healed strategy** as the new primary

### Self-Healing Settings

In the step editor, configure:
- **Self-Healing Enabled**: Turn on/off (default: ON)
- **Auto-Approve**: Automatically approve high-confidence healings
- **Confidence Threshold**: Minimum confidence for auto-approval (default: 0.9)

---

## Variables & Dynamic Data

### Types of Variables

| Type | Example | Use Case |
|------|---------|----------|
| **String** | `"john@example.com"` | Emails, names, text |
| **Number** | `42` | Counts, IDs, prices |
| **Boolean** | `true` | Flags, toggles |
| **JSON** | `{"name": "John", "age": 30}` | Complex data |

### Built-in Variables

TestForge provides special built-in variables:

| Variable | Value | Example |
|----------|-------|---------|
| `{{$timestamp}}` | Current timestamp | `1675890123456` |
| `{{$randomString}}` | Random string | `"x7k2p9"` |
| `{{$randomNumber}}` | Random number | `42` |
| `{{$uuid}}` | UUID v4 | `"a1b2c3d4-..."` |

### Using Variables

**In step values:**
```
Fill email input with: {{userEmail}}
Fill password input with: {{userPassword}}
Navigate to: /users/{{userId}}
```

**In API requests:**
```json
{
  "email": "{{userEmail}}",
  "name": "{{userName}}",
  "timestamp": "{{$timestamp}}"
}
```

**Nested object access:**
```
{{response.data.user.id}}
{{items[0].name}}
```

### Variable Priority

When there are multiple variables with the same name, TestForge uses this order:

1. **Step-local variables** (from `api-request` saveAs)
2. **Scenario variables** (defined in the scenario)
3. **Component parameters** (passed to components)
4. **Service defaults** (future feature)
5. **Environment variables** (future feature)

---

## Reusable Components

### What are Components?

**Components** are reusable flows that you can call from multiple scenarios.

**Examples:**
- Admin login flow
- Database setup/teardown
- Common navigation sequences
- Standard assertions

### Component Types

| Type | Purpose | Example |
|------|---------|---------|
| **Flow** | Sequence of actions | Login, navigation |
| **Assertion** | Reusable checks | Verify user is logged in |
| **Setup** | Test preparation | Create test data |
| **Teardown** | Test cleanup | Delete test data |

### Creating a Component

1. Navigate to **Components** page
2. Click **"+ New Component"**
3. Fill in the form:
   - **Name**: "Admin Login"
   - **Description**: "Logs in as admin user"
   - **Type**: Flow
4. Define **Parameters** (optional):
   - Parameter 1: `email` (string, required)
   - Parameter 2: `password` (string, required)
5. Add **Steps** (just like in scenarios)
6. Use parameters in steps: `{{email}}`, `{{password}}`
7. Click **"Save"**

### Using a Component

In the Scenario Editor:

1. Click **"+ Add Step"**
2. Select **"Component"** as the type
3. Choose your component from the dropdown
4. Provide parameter values:
   ```
   email: {{adminEmail}}
   password: {{adminPassword}}
   ```

### Component Example

**Component: "Admin Login"**

Parameters:
- `email` (string, required)
- `password` (string, required)

Steps:
1. Navigate to `/admin/login`
2. Fill `email-input` with `{{email}}`
3. Fill `password-input` with `{{password}}`
4. Click `login-button`
5. Wait for URL to contain `/admin/dashboard`

**Usage in Scenario:**
```
Step 1: Component "Admin Login"
  └─ email: "admin@test.com"
  └─ password: "admin123"
```

---

## API Testing

TestForge supports HTTP API testing alongside browser tests.

### API Request Step

**Purpose**: Make an HTTP request and optionally save the response.

**Configuration:**
- **Method**: GET, POST, PUT, PATCH, DELETE
- **URL**: API endpoint (can use variables)
- **Headers**: Optional HTTP headers
- **Body**: Request body (for POST/PUT/PATCH)
- **Save Response As**: Variable name to store response

**Example: Create User API**
```
Type: API Request
Method: POST
URL: {{baseUrl}}/api/users
Headers:
  Content-Type: application/json
  Authorization: Bearer {{token}}
Body:
  {
    "email": "{{userEmail}}",
    "name": "{{userName}}"
  }
Save Response As: createUserResponse
```

### API Assert Step

**Purpose**: Validate API response.

**Assert Types:**

#### 1. Status Code
```
Type: API Assert
Assert Type: Status
Expected Status: 200
Response Ref: createUserResponse (or leave empty for last response)
```

#### 2. Header
```
Type: API Assert
Assert Type: Header
Header Name: Content-Type
Expected Value: application/json
Operator: contains
```

#### 3. Body (JSON Path)
```
Type: API Assert
Assert Type: Body
JSON Path: data.user.email
Expected Value: {{userEmail}}
Operator: equals
```

### Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `equals` | Exact match | `"john@example.com"` |
| `contains` | Partial match | `"@example.com"` |
| `matches` | Regex match | `"^[a-z]+@.*"` |
| `exists` | Field exists | (no expected value needed) |
| `type` | Type check | `"string"`, `"number"`, `"boolean"` |

### Mixed Scenarios (Browser + API)

You can combine browser and API steps in a single scenario:

```
Scenario: "User Registration Flow"
  1. API Request: POST /api/users (create account)
  2. API Assert: Status = 201
  3. Navigate: /login
  4. Fill: email input with {{userEmail}}
  5. Fill: password input with {{userPassword}}
  6. Click: "Login" button
  7. Assert: URL contains /dashboard
```

---

## Running Tests

### Manual Execution

1. Navigate to your scenario
2. Click **"▶️ Run"** button
3. You'll be redirected to the **Run Detail** page
4. Watch real-time execution via Server-Sent Events (SSE)

### Run Detail Page

Shows:
- **Run status**: Pending → Running → Passed/Failed
- **Duration**: Total execution time
- **Step-by-step progress**:
  - ✅ Passed steps (green)
  - ❌ Failed steps (red)
  - ⚠️ Healed steps (yellow with healing icon)
- **Healing details**: Original vs. used strategies
- **Error messages**: For failed steps
- **Screenshots**: If captured (future enhancement)

### Run History

Navigate to **"Runs"** page to see:
- All test executions
- Filter by scenario, status, date
- Quick re-run capability
- Detailed drill-down

### Re-running Tests

**From Run Detail:**
- Click **"🔄 Re-run"** button

**From Scenario Editor:**
- Click **"▶️ Run"** button

**From Run History:**
- Click **"▶️"** icon on any run

---

## Managing Self-Healing

### Healing Dashboard

Navigate to **"Self-Healing"** page to see:

#### Stats Cards
- **Auto Approved**: High-confidence healings (✓ green)
- **Pending Approval**: Need review (⚠️ yellow)
- **Rejected**: Failed healings (❌ red)

#### Filters
- **Status**: All, Pending, Approved, Rejected, Auto-Approved
- **Search**: Find by locator name or scenario

### Reviewing Healing Records

Each healing record shows:

1. **Locator Display Name**: What element healed
2. **Scenario**: Which test triggered the healing
3. **Trigger Reason**:
   - `element_not_found`: Original strategy failed
   - `multiple_matches`: Multiple elements found
   - `wrong_element`: Element found but incorrect
4. **Strategy Change**:
   - **Original**: What failed (e.g., testId)
   - **Healed**: What worked (e.g., role)
5. **Confidence**: 0-100% (higher = more reliable)
6. **Affected Scenarios**: How many scenarios use this locator

### Approving Healings

**Single Approval:**
1. Click **"✅ Approve"** on a healing record
2. The healed strategy becomes the new primary strategy
3. Future runs will use the healed locator

**Bulk Approval:**
1. Click **"✅ Approve All"** (for high-confidence healings)
2. All pending healings with confidence > 90% are approved

**Propagation:**
1. Click **"Propagate →"** to apply healing to other scenarios
2. TestForge finds scenarios using the same locator
3. Updates all of them with the healed strategy

### Rejecting Healings

If a healing is incorrect:

1. Click **"❌ Reject"** on the healing record
2. Add a **Review Note** explaining why
3. The original strategy remains unchanged
4. Future runs will retry healing (may create new healing records)

### Confidence Levels

| Confidence | Meaning | Recommendation |
|------------|---------|----------------|
| **90-100%** | Very reliable | Auto-approve |
| **70-89%** | Likely correct | Manual review |
| **50-69%** | Uncertain | Review carefully |
| **< 50%** | Low confidence | Likely reject |

---

## Best Practices

### 1. Test Organization

✅ **DO:**
- Group scenarios by feature, not by page
- Use clear, descriptive names
- Tag scenarios appropriately
- Keep scenarios focused (one goal per scenario)

❌ **DON'T:**
- Create mega-scenarios testing everything
- Use technical names (use business language)
- Duplicate scenarios unnecessarily

### 2. Locator Strategy

✅ **DO:**
- Use `data-testid` as primary strategy
- Add 2-3 fallback strategies
- Use semantic selectors (role, label)
- Enable Self-Healing

❌ **DON'T:**
- Rely solely on CSS selectors
- Use XPath unless necessary
- Use brittle locators (e.g., nth-child)

### 3. Variables

✅ **DO:**
- Extract repeated values to variables
- Use descriptive variable names
- Document variable purposes

❌ **DON'T:**
- Hardcode values in steps
- Use cryptic variable names
- Overuse variables (keep it readable)

### 4. Components

✅ **DO:**
- Extract common flows (login, setup)
- Parameterize components for flexibility
- Document component usage

❌ **DON'T:**
- Create components for single-use flows
- Over-nest components (keep it simple)
- Create overly generic components

### 5. Healing Management

✅ **DO:**
- Review healings regularly
- Approve high-confidence healings
- Reject incorrect healings promptly
- Propagate healings to other scenarios

❌ **DON'T:**
- Ignore pending healings
- Auto-approve everything blindly
- Let healing records pile up

---

## Troubleshooting

### Common Issues

#### Test Fails Immediately

**Problem**: Test fails before executing any steps.

**Solutions**:
- Check that the service base URL is correct
- Verify the application is running and accessible
- Check for network connectivity issues

#### Element Not Found (All Strategies Failed)

**Problem**: TestForge can't find the element with any strategy.

**Solutions**:
1. **Check the page**: Is the element actually there?
2. **Wait for the page**: Add a "Wait" step before the action
3. **Check the locators**: Are they correct? Inspect the element in DevTools
4. **Dynamic content**: Element might load asynchronously

#### Healing Not Working

**Problem**: Self-Healing isn't creating healing records.

**Solutions**:
- Check that Self-Healing is enabled in step settings
- Verify fallback strategies are configured
- Ensure at least one fallback strategy would succeed

#### Flaky Tests

**Problem**: Test passes sometimes, fails other times.

**Solutions**:
- Add explicit waits before assertions
- Increase timeouts for slow operations
- Check for race conditions (async operations)
- Use more stable locators (testId instead of CSS)

#### API Test Fails

**Problem**: API request returns unexpected response.

**Solutions**:
- Verify the API endpoint URL
- Check request headers and body
- Ensure authentication is correct
- Check for API rate limiting
- Verify the expected response structure

#### Variable Not Interpolating

**Problem**: `{{variableName}}` appears as-is instead of being replaced.

**Solutions**:
- Check that the variable is defined in the scenario
- Verify variable name spelling and capitalization
- Check variable priority (step > scenario > component)

---

## Advanced Topics

### Custom Step Timeout

Override the default timeout for slow operations:

```
Step: Click "Generate Report" button
Timeout: 60000 (60 seconds)
```

### Continue on Error

Don't stop the test if a step fails:

```
Step: Take screenshot (for debugging)
Continue on Error: ✓ Enabled
```

### Screenshot Capture

Capture screenshots for debugging:

```
Type: Screenshot
Name: after-login
Full Page: true
```

### Multiple Assertions

Combine multiple assertions:

```
Step 1: Assert URL contains "/dashboard"
Step 2: Assert element visible (welcome message)
Step 3: Assert text equals "Welcome, John!"
```

### Nested JSON Access

Access nested API response data:

```
{{response.data.user.profile.email}}
{{response.items[0].name}}
{{response.metadata.pagination.totalCount}}
```

---

## Getting Help

### Resources

- **PRD**: [docs/PRD.md](./PRD.md) - Technical specification
- **README**: [../README.md](../README.md) - Developer documentation
- **GitHub Issues**: Report bugs and request features

### Support Channels

- **Email**: support@testforge.dev
- **GitHub Discussions**: Community forum
- **Slack**: #testforge-help (if available)

---

## Glossary

| Term | Definition |
|------|------------|
| **Service** | The application or system under test |
| **Feature** | A logical grouping of related functionality |
| **Scenario** | A single test case with a clear objective |
| **Step** | An individual action within a scenario |
| **Locator** | A way to find an element on the page |
| **Strategy** | A specific method for locating an element |
| **Self-Healing** | Automatic adaptation when locators fail |
| **Healing Record** | A record of a self-healing event |
| **Component** | A reusable sequence of steps |
| **Variable** | A named value used across steps |
| **Confidence** | A measure of healing reliability (0-1) |
| **SSE** | Server-Sent Events for real-time updates |

---

<div align="center">

**Happy Testing! 🧪**

Need help? Check the [troubleshooting section](#troubleshooting) or [contact support](#getting-help).

</div>
