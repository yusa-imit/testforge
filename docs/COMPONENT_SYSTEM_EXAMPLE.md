# Component System Implementation

**Status**: ✅ Implemented (PRD Section 5.3)

---

## Overview

The component system allows you to create reusable test flows that can be called from scenarios with different parameters.

---

## Example: Login Component

### 1. Create a Login Component

```typescript
POST /api/components

{
  "name": "관리자 로그인",
  "description": "관리자 계정으로 로그인",
  "type": "flow",
  "parameters": [
    {
      "name": "email",
      "type": "string",
      "required": true,
      "description": "로그인 이메일"
    },
    {
      "name": "password",
      "type": "string",
      "required": true,
      "description": "로그인 비밀번호"
    }
  ],
  "steps": [
    {
      "id": "...",
      "type": "navigate",
      "description": "로그인 페이지로 이동",
      "config": {
        "url": "/login"
      }
    },
    {
      "id": "...",
      "type": "fill",
      "description": "이메일 입력",
      "config": {
        "locator": {
          "displayName": "이메일 입력 필드",
          "strategies": [
            { "type": "testId", "value": "email-input", "priority": 1 },
            { "type": "label", "value": "이메일", "priority": 2 }
          ],
          "healing": {
            "enabled": true,
            "autoApprove": false,
            "confidenceThreshold": 0.9
          }
        },
        "value": "{{email}}"
      }
    },
    {
      "id": "...",
      "type": "fill",
      "description": "비밀번호 입력",
      "config": {
        "locator": {
          "displayName": "비밀번호 입력 필드",
          "strategies": [
            { "type": "testId", "value": "password-input", "priority": 1 },
            { "type": "label", "value": "비밀번호", "priority": 2 }
          ],
          "healing": { "enabled": true, "autoApprove": false, "confidenceThreshold": 0.9 }
        },
        "value": "{{password}}"
      }
    },
    {
      "id": "...",
      "type": "click",
      "description": "로그인 버튼 클릭",
      "config": {
        "locator": {
          "displayName": "로그인 버튼",
          "strategies": [
            { "type": "testId", "value": "login-button", "priority": 1 },
            { "type": "role", "role": "button", "name": "로그인", "priority": 2 }
          ],
          "healing": { "enabled": true, "autoApprove": false, "confidenceThreshold": 0.9 }
        }
      }
    }
  ]
}
```

### 2. Use Component in Scenario

```typescript
POST /api/features/:featureId/scenarios

{
  "name": "지원자 상태 변경",
  "description": "지원자 상태를 서류합격으로 변경",
  "priority": "high",
  "tags": ["smoke", "regression"],
  "variables": [
    {
      "name": "adminEmail",
      "type": "string",
      "defaultValue": "admin@test.com"
    },
    {
      "name": "adminPassword",
      "type": "string",
      "defaultValue": "password123"
    }
  ],
  "steps": [
    {
      "id": "...",
      "type": "component",
      "description": "관리자로 로그인",
      "config": {
        "componentId": "comp-login-admin",
        "parameters": {
          "email": "{{adminEmail}}",
          "password": "{{adminPassword}}"
        }
      }
    },
    {
      "id": "...",
      "type": "navigate",
      "description": "지원자 목록으로 이동",
      "config": {
        "url": "/admin/applicants"
      }
    },
    {
      "id": "...",
      "type": "click",
      "description": "지원자 상태 변경",
      "config": {
        "locator": {
          "displayName": "상태 변경 버튼",
          "strategies": [
            { "type": "testId", "value": "status-change-btn", "priority": 1 }
          ],
          "healing": { "enabled": true, "autoApprove": false, "confidenceThreshold": 0.9 }
        }
      }
    }
  ]
}
```

---

## How It Works

### 1. Component Expansion

When the executor encounters a `component` step:

```typescript
// Original step
{
  type: "component",
  description: "관리자로 로그인",
  config: {
    componentId: "comp-login-admin",
    parameters: {
      email: "{{adminEmail}}",
      password: "{{adminPassword}}"
    }
  }
}
```

It expands to the component's steps:

```typescript
[
  {
    type: "navigate",
    description: "로그인 페이지로 이동",
    config: { url: "/login" }
  },
  {
    type: "fill",
    description: "이메일 입력",
    config: {
      locator: { ... },
      value: "admin@test.com"  // ← Interpolated from {{adminEmail}}
    }
  },
  {
    type: "fill",
    description: "비밀번호 입력",
    config: {
      locator: { ... },
      value: "password123"  // ← Interpolated from {{adminPassword}}
    }
  },
  {
    type: "click",
    description: "로그인 버튼 클릭",
    config: { locator: { ... } }
  }
]
```

### 2. Parameter Binding

```typescript
// Component parameters definition
parameters: [
  { name: "email", type: "string", required: true },
  { name: "password", type: "string", required: true }
]

// Component call parameters
parameters: {
  email: "{{adminEmail}}",      // Variable reference
  password: "{{adminPassword}}"  // Variable reference
}

// Scenario variables
variables: {
  adminEmail: "admin@test.com",
  adminPassword: "password123"
}

// Result after binding
{
  email: "admin@test.com",
  password: "password123"
}
```

### 3. Execution Flow

```
1. Load scenario
2. Initialize variables
3. Expand steps:
   - If step.type === "component":
     → Load component from DB
     → Bind parameters
     → Replace component step with expanded steps
   - Else:
     → Keep step as-is
4. Execute expanded steps sequentially
5. Save results
```

---

## Component Usage Tracking

Check where a component is used:

```bash
GET /api/components/:id/usages
```

Response:
```json
{
  "success": true,
  "data": {
    "component": { ... },
    "usedBy": [
      {
        "scenarioId": "scenario-123",
        "stepIndices": [0, 5]  // Used at step 0 and 5
      },
      {
        "scenarioId": "scenario-456",
        "stepIndices": [2]
      }
    ],
    "totalUsages": 3
  }
}
```

---

## Benefits

1. **Reusability**: Write login flow once, use everywhere
2. **Maintainability**: Update login flow in one place
3. **Consistency**: Same flow across all scenarios
4. **Parameters**: Customize behavior with different inputs
5. **Tracking**: Know which scenarios use which components

---

## Implementation Details

### File: `packages/core/src/executor/engine.ts`

**Key Methods:**
- `expandSteps()` - Expands component steps recursively
- `expandComponentStep()` - Expands a single component step
- `bindComponentParameters()` - Binds parameters to component
- `applyParametersToConfig()` - Applies parameters to step configs

**Changes Made:**
- Added `componentLoader` to `ExecutionOptions`
- Added component expansion before step execution
- Added parameter binding logic with variable interpolation
- Added recursive config parameter application

### File: `packages/server/src/routes/scenarios.ts`

**Changes Made:**
- Added `componentLoader` callback to executor options
- Loader fetches components from database

---

## Testing

### Create Test Component:

```bash
curl -X POST http://localhost:3001/api/components \
  -H "Content-Type: application/json" \
  -d '{
    "name": "테스트 로그인",
    "type": "flow",
    "parameters": [
      { "name": "email", "type": "string", "required": true }
    ],
    "steps": [
      {
        "id": "step-1",
        "type": "navigate",
        "description": "로그인 페이지",
        "config": { "url": "/login" }
      }
    ]
  }'
```

### Use in Scenario:

```bash
curl -X POST http://localhost:3001/api/features/FEATURE_ID/scenarios \
  -H "Content-Type: application/json" \
  -d '{
    "name": "컴포넌트 테스트",
    "variables": [
      { "name": "userEmail", "type": "string", "defaultValue": "test@test.com" }
    ],
    "steps": [
      {
        "id": "step-1",
        "type": "component",
        "description": "로그인",
        "config": {
          "componentId": "COMPONENT_ID",
          "parameters": { "email": "{{userEmail}}" }
        }
      }
    ]
  }'
```

### Execute:

```bash
curl -X POST http://localhost:3001/api/scenarios/SCENARIO_ID/run
```

The executor will:
1. Load the component
2. Expand component step to its sub-steps
3. Bind `email` parameter with `{{userEmail}}` → `"test@test.com"`
4. Execute navigate step with `/login`

---

## Status

✅ **Fully Implemented** according to PRD Section 5.3

- [x] Component expansion logic
- [x] Parameter binding
- [x] Variable interpolation
- [x] Recursive config application
- [x] Component loader integration
- [x] Component usage tracking API
