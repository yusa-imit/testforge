# TestForge 🧪

> **Self-Healing Automated Testing Platform for QA Engineers and Product Managers**

TestForge is an intelligent test automation platform that combines browser (E2E) and API testing with a revolutionary Self-Healing system. When UI elements change, TestForge automatically adapts using multi-layer selector strategies, reducing test maintenance to near zero.

[![Tech Stack](https://img.shields.io/badge/Runtime-Bun-f472b6)](https://bun.sh)
[![Tech Stack](https://img.shields.io/badge/Framework-React-61dafb)](https://react.dev)
[![Tech Stack](https://img.shields.io/badge/Backend-Hono-e36002)](https://hono.dev)
[![Tech Stack](https://img.shields.io/badge/Database-DuckDB-ffc107)](https://duckdb.org)
[![Tech Stack](https://img.shields.io/badge/Testing-Playwright-2ead33)](https://playwright.dev)

---

## 🌟 Key Features

### 🏗️ **Hierarchical Test Organization**
- **Service** → **Feature** → **Scenario** → **Step**
- Organize tests by business logic, not technical implementation
- Perfect for large applications with multiple features

### 🔄 **Self-Healing Technology**
- **Multi-layer selectors**: testId → role → text → label → css → xpath
- Automatic fallback when UI changes
- Confidence scoring for healing suggestions
- Approval workflow for production safety

### 🧩 **Reusable Components**
- Extract common flows (login, navigation, setup)
- Parameterize and reuse across scenarios
- Track component usage across all scenarios

### 🌐 **Unified Testing**
- **Browser automation** with Playwright
- **API testing** with request/response validation
- **Mixed scenarios**: Combine browser and API steps seamlessly

### ⚡ **Real-time Execution**
- Live step-by-step progress via Server-Sent Events (SSE)
- Instant feedback on test execution
- Visual healing indicators

### 👥 **No-Code Friendly**
- Visual scenario editor
- Point-and-click step creation
- QA engineers and product managers can create tests

---

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

- **[Bun](https://bun.sh)** v1.0+ (runtime and package manager)
- **[Node.js](https://nodejs.org)** v18+ (for compatibility)
- **[Git](https://git-scm.com)**

#### Install Bun

```bash
# macOS, Linux, WSL
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/testforge.git
cd testforge
```

2. **Install dependencies**

```bash
bun install
```

3. **Install Playwright browsers**

```bash
bunx playwright install chromium
```

4. **Initialize the database**

```bash
bun run db:migrate
```

5. **Seed sample data** (optional)

```bash
bun run db:seed
```

### Running the Application

**Start both server and web app** (recommended):

```bash
bun run dev
```

This will start:
- 🖥️ **API Server**: http://localhost:3001
- 🌐 **Web UI**: http://localhost:3000

**Or start them individually**:

```bash
# Terminal 1 - API Server
bun run dev:server

# Terminal 2 - Web UI
bun run dev:web
```

### Your First Test

1. **Open the web UI**: http://localhost:3000
2. **Create a Service**: Click "New Service", enter name and base URL
3. **Create a Feature**: Select your service, add a feature
4. **Create a Scenario**: Add steps using the visual editor
5. **Run the test**: Click the "▶️ Run" button
6. **Watch it execute**: See real-time step-by-step progress

---

## 📚 Tech Stack

### Runtime & Build
- **[Bun](https://bun.sh)** - Fast all-in-one JavaScript runtime
- **[TypeScript](https://www.typescriptlang.org)** - Type safety across the stack
- **Bun Workspace** - Monorepo management

### Frontend
- **[React 18](https://react.dev)** - UI framework
- **[Rsbuild](https://rsbuild.dev)** - Fast Rspack-based build tool
- **[React Router](https://reactrouter.com)** - Client-side routing
- **[Zustand](https://zustand-demo.pmnd.rs)** - Lightweight state management
- **[TanStack Query](https://tanstack.com/query)** - Server state management
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first CSS
- **[shadcn/ui](https://ui.shadcn.com)** - High-quality React components
- **[Axios](https://axios-http.com)** - HTTP client

### Backend
- **[Hono](https://hono.dev)** - Ultrafast web framework
- **[Hono RPC](https://hono.dev/docs/guides/rpc)** - Type-safe client-server communication
- **[DuckDB](https://duckdb.org)** - Embedded analytical database
- **[Drizzle ORM](https://orm.drizzle.team)** - TypeScript ORM
- **[Zod](https://zod.dev)** - Schema validation

### Test Execution
- **[Playwright](https://playwright.dev)** - Browser automation
- **Built-in Fetch API** - HTTP/API testing

---

## 📁 Project Structure

```
testforge/
├── packages/
│   ├── core/                    # Core test execution logic
│   │   ├── src/
│   │   │   ├── executor/        # Test execution engine
│   │   │   │   └── engine.ts    # Main TestExecutor class
│   │   │   ├── locator/         # Multi-layer selector resolution
│   │   │   │   └── resolver.ts  # LocatorResolver with Self-Healing
│   │   │   ├── healing/         # Self-Healing tracking
│   │   │   │   └── tracker.ts   # HealingTracker
│   │   │   ├── api/             # API testing client
│   │   │   │   └── client.ts    # HTTP request executor
│   │   │   └── types/           # TypeScript type definitions
│   │   │       └── index.ts     # All core types (PRD Section 3)
│   │   └── package.json
│   │
│   ├── server/                  # API Server (Hono)
│   │   ├── src/
│   │   │   ├── routes/          # API endpoints
│   │   │   │   ├── services.ts  # Service CRUD
│   │   │   │   ├── features.ts  # Feature CRUD
│   │   │   │   ├── scenarios.ts # Scenario CRUD + execution
│   │   │   │   ├── components.ts # Component CRUD
│   │   │   │   ├── healing.ts   # Healing records
│   │   │   │   └── runs.ts      # Test runs + SSE stream
│   │   │   ├── db/              # Database layer
│   │   │   │   ├── schema.ts    # Drizzle schema definitions
│   │   │   │   ├── database.ts  # Database operations
│   │   │   │   ├── connection.ts # DuckDB connection
│   │   │   │   └── migrate.ts   # Migration runner
│   │   │   ├── execution/       # Test execution management
│   │   │   │   └── manager.ts   # ExecutionManager (singleton)
│   │   │   ├── middleware/      # Middleware
│   │   │   │   └── errorHandler.ts # Global error handler
│   │   │   ├── utils/           # Utilities
│   │   │   │   └── errors.ts    # Custom error classes
│   │   │   └── index.ts         # Server entry point
│   │   └── package.json
│   │
│   └── web/                     # Frontend (React + Rsbuild)
│       ├── src/
│       │   ├── components/      # UI components
│       │   │   ├── ui/          # shadcn/ui components
│       │   │   └── ...          # Custom components
│       │   ├── pages/           # Route pages
│       │   │   ├── Dashboard.tsx        # Home dashboard
│       │   │   ├── Services.tsx         # Service list
│       │   │   ├── ServiceDetail.tsx    # Service detail
│       │   │   ├── FeatureDetail.tsx    # Feature detail
│       │   │   ├── ScenarioEditor.tsx   # Scenario editor
│       │   │   ├── Components.tsx       # Component list
│       │   │   ├── ComponentEditor.tsx  # Component editor
│       │   │   ├── Runs.tsx             # Test run history
│       │   │   ├── RunDetail.tsx        # Run detail (SSE)
│       │   │   └── Healing.tsx          # Healing dashboard
│       │   ├── lib/             # Utilities
│       │   │   └── api.ts       # API client (Axios)
│       │   ├── stores/          # Zustand stores
│       │   ├── hooks/           # Custom React hooks
│       │   ├── App.tsx          # App root
│       │   └── main.tsx         # Entry point
│       ├── rsbuild.config.ts    # Rsbuild configuration
│       └── package.json
│
├── scripts/                     # Development scripts
│   ├── dev.ts                   # Concurrent dev server launcher
│   └── seed.ts                  # Database seeding script
│
├── docs/                        # Documentation
│   ├── PRD.md                   # Product Requirements Document
│   └── USER_GUIDE.md            # User documentation
│
├── CLAUDE.md                    # Claude Code project guide
├── HEALING_DASHBOARD_ENHANCEMENTS.md  # Recent work log
├── package.json                 # Root workspace config
├── bunfig.toml                  # Bun configuration
├── tsconfig.json                # TypeScript configuration
└── README.md                    # This file
```

---

## 🛠️ Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start both server and web app in parallel |
| `bun run dev:server` | Start API server only (port 3001) |
| `bun run dev:web` | Start web app only (port 3000) |
| `bun run build` | Build both server and web for production |
| `bun run build:server` | Build server only |
| `bun run build:web` | Build web only |
| `bun run db:migrate` | Run database migrations |
| `bun run db:seed` | Seed database with sample data |
| `bun run test` | Run test suite |
| `bun run lint` | Lint TypeScript files |
| `bun run typecheck` | Type check without emitting files |

### Development Workflow

1. **Make changes** to code in `packages/`
2. **Hot reload** is enabled for both server and web
3. **Type checking** runs automatically in your editor (VS Code recommended)
4. **Lint before committing**: `bun run lint`
5. **Run tests**: `bun test`

### Adding New Dependencies

**For the entire workspace:**
```bash
bun add <package>
```

**For a specific package:**
```bash
cd packages/web
bun add <package>
```

**For development only:**
```bash
bun add -d <package>
```

### Database Management

**View database contents:**
```bash
# Install DuckDB CLI (optional)
# macOS
brew install duckdb

# Then query
duckdb testforge.duckdb
> SELECT * FROM services;
> .tables  -- list all tables
> .quit
```

**Reset database:**
```bash
rm testforge.duckdb
bun run db:migrate
bun run db:seed
```

### Adding UI Components (shadcn/ui)

```bash
cd packages/web

# Add a new component
bunx shadcn@latest add <component-name>

# Examples
bunx shadcn@latest add button
bunx shadcn@latest add dialog
bunx shadcn@latest add table
```

---

## 🧪 Testing

### Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests in a specific package
cd packages/core
bun test
```

### Creating Tests

```bash
# Create a test file next to your source
# Example: packages/core/src/locator/resolver.test.ts

import { describe, test, expect } from "bun:test";
import { LocatorResolver } from "./resolver";

describe("LocatorResolver", () => {
  test("should resolve element by testId", async () => {
    // Test implementation
  });
});
```

---

## 🏗️ Architecture

### Data Flow

```
User Action (Web UI)
    ↓
API Request (Hono RPC)
    ↓
Business Logic (Server)
    ↓
Database (DuckDB) or Test Execution (Core)
    ↓
Response / SSE Events
    ↓
UI Update (React + TanStack Query)
```

### Test Execution Flow

```
1. Scenario Loaded
    ↓
2. Variables Initialized
    ↓
3. Browser Context Created (Playwright)
    ↓
4. Steps Executed Sequentially
    ├─ Component Steps → Expanded to sub-steps
    ├─ Browser Steps → LocatorResolver → Self-Healing
    └─ API Steps → HTTP Request + Validation
    ↓
5. Results Saved to Database
    ↓
6. SSE Events Sent to Client
    ↓
7. Browser Cleanup
```

### Self-Healing Process

```
1. Try primary locator strategy (e.g., testId)
    ↓
2. Element not found?
    ↓
3. Try fallback strategies (role → text → css)
    ↓
4. Element found with fallback?
    ↓
5. Create HealingRecord with confidence score
    ↓
6. Auto-approve if confidence > threshold
    ↓
7. Otherwise, await manual approval
    ↓
8. Approved? Update scenario with healed locator
```

---

## 📖 Documentation

- **[Product Requirements Document (PRD)](./docs/PRD.md)** - Complete technical specification
- **[User Guide](./docs/USER_GUIDE.md)** - How to use TestForge
- **[Claude Code Guide](./CLAUDE.md)** - Development guidelines for AI agents
- **[Healing Dashboard Enhancements](./HEALING_DASHBOARD_ENHANCEMENTS.md)** - Recent feature work

---

## 🗺️ Roadmap

### ✅ Phase 1: Foundation (Complete)
- [x] Monorepo setup
- [x] Database schema & migrations
- [x] Basic CRUD APIs
- [x] Frontend structure

### ✅ Phase 2: Self-Healing (Complete)
- [x] Multi-layer locator system
- [x] Self-Healing detection
- [x] Healing approval workflow
- [x] Confidence scoring

### ✅ Phase 3: Components & API Testing (Complete)
- [x] Reusable component system
- [x] Component parameter binding
- [x] API request/assert steps
- [x] Response validation

### 🚧 Phase 4: Polish & Stabilization (95% Complete)
- [x] Real-time SSE execution
- [x] Error handling
- [x] Scenario duplication
- [ ] Screenshot improvements
- [ ] Advanced search/filtering
- [ ] Comprehensive documentation

### 🔮 Future Enhancements
- [ ] CI/CD integration (GitHub Actions, GitLab CI)
- [ ] Multi-browser support (Firefox, Safari)
- [ ] Visual regression testing
- [ ] Test result analytics dashboard
- [ ] AI-powered test generation
- [ ] Mobile app testing (iOS, Android)
- [ ] Performance testing support

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Follow the coding conventions** (see [CLAUDE.md](./CLAUDE.md))
4. **Read the PRD** before implementing features
5. **Write tests** for new functionality
6. **Run linting**: `bun run lint`
7. **Commit your changes**: `git commit -m 'feat: add amazing feature'`
8. **Push to the branch**: `git push origin feature/amazing-feature`
9. **Open a Pull Request**

### Commit Message Convention

```
feat: add new feature
fix: bug fix
refactor: code refactoring
docs: documentation updates
chore: dependency updates, config changes
```

---

## 🐛 Troubleshooting

### Bun command not found

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$HOME/.bun/bin:$PATH"
```

### Playwright browsers missing

```bash
bunx playwright install chromium
```

### Database errors

```bash
# Reset the database
rm testforge.duckdb
bun run db:migrate
```

### Port already in use

```bash
# Find and kill process on port 3000 or 3001
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### TypeScript errors

```bash
# Full type check
bun run typecheck

# Clean install
rm -rf node_modules bun.lockb
bun install
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **[Bun](https://bun.sh)** - For the amazing runtime
- **[Hono](https://hono.dev)** - For the ultrafast web framework
- **[Playwright](https://playwright.dev)** - For reliable browser automation
- **[shadcn/ui](https://ui.shadcn.com)** - For beautiful, accessible components
- **[DuckDB](https://duckdb.org)** - For the embedded analytical database

---

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/testforge/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/testforge/discussions)
- **Email**: support@testforge.dev

---

<div align="center">

**Built with ❤️ by the TestForge Team**

[Website](https://testforge.dev) • [Documentation](./docs) • [Twitter](https://twitter.com/testforge)

</div>
