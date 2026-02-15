/**
 * Database Seed Script
 *
 * Creates sample data for testing and development:
 * - 2 Services (E-commerce, Admin Portal)
 * - Multiple Features per service
 * - Example scenarios with realistic steps
 * - Sample components (Login, Logout)
 */

import { v4 as uuid } from "uuid";
import { initDatabase } from "../packages/server/src/db/connection";
import type {
  Service,
  Feature,
  Scenario,
  Component,
  Step,
  Variable,
  ParameterDef,
} from "../packages/core/src/types";

async function seed() {
  console.log("🌱 Starting database seed...\n");

  const db = await initDatabase("./packages/server/testforge.duckdb");

  // Clear existing data
  console.log("🗑️  Clearing existing data...");
  await db.run("DELETE FROM healing_records");
  await db.run("DELETE FROM step_results");
  await db.run("DELETE FROM test_runs");
  await db.run("DELETE FROM scenarios");
  await db.run("DELETE FROM components");
  await db.run("DELETE FROM features");
  await db.run("DELETE FROM services");
  console.log("✅ Cleared\n");

  // ==================== SERVICES ====================
  console.log("📦 Creating services...");

  const ecommerceService: Service = {
    id: uuid(),
    name: "E-commerce Platform",
    description: "Main shopping website",
    baseUrl: "https://demo.testforge.example.com",
    defaultTimeout: 30000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const adminService: Service = {
    id: uuid(),
    name: "Admin Portal",
    description: "Internal admin dashboard",
    baseUrl: "https://admin.testforge.example.com",
    defaultTimeout: 30000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.run(
    `INSERT INTO services VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      ecommerceService.id,
      ecommerceService.name,
      ecommerceService.description,
      ecommerceService.baseUrl,
      ecommerceService.defaultTimeout,
      ecommerceService.createdAt.toISOString(),
      ecommerceService.updatedAt.toISOString(),
    ]
  );

  await db.run(
    `INSERT INTO services VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      adminService.id,
      adminService.name,
      adminService.description,
      adminService.baseUrl,
      adminService.defaultTimeout,
      adminService.createdAt.toISOString(),
      adminService.updatedAt.toISOString(),
    ]
  );

  console.log(`✅ Created 2 services\n`);

  // ==================== COMPONENTS ====================
  console.log("🧩 Creating reusable components...");

  const loginComponent: Component = {
    id: uuid(),
    name: "User Login",
    description: "Standard user login flow",
    type: "flow",
    parameters: [
      {
        name: "email",
        type: "string",
        required: true,
        description: "User email address",
      },
      {
        name: "password",
        type: "string",
        required: true,
        description: "User password",
      },
    ],
    steps: [
      {
        id: uuid(),
        type: "navigate",
        description: "Navigate to login page",
        config: { url: "/login" },
      },
      {
        id: uuid(),
        type: "fill",
        description: "Enter email",
        config: {
          locator: {
            displayName: "Email Input",
            strategies: [
              { type: "testId", value: "email-input", priority: 1 },
              { type: "label", value: "Email", priority: 2 },
              { type: "css", selector: 'input[type="email"]', priority: 3 },
            ],
            healing: {
              enabled: true,
              autoApprove: true,
              confidenceThreshold: 0.9,
            },
          },
          value: "{{email}}",
        },
      },
      {
        id: uuid(),
        type: "fill",
        description: "Enter password",
        config: {
          locator: {
            displayName: "Password Input",
            strategies: [
              { type: "testId", value: "password-input", priority: 1 },
              { type: "label", value: "Password", priority: 2 },
              { type: "css", selector: 'input[type="password"]', priority: 3 },
            ],
            healing: {
              enabled: true,
              autoApprove: true,
              confidenceThreshold: 0.9,
            },
          },
          value: "{{password}}",
        },
      },
      {
        id: uuid(),
        type: "click",
        description: "Click login button",
        config: {
          locator: {
            displayName: "Login Button",
            strategies: [
              { type: "testId", value: "login-btn", priority: 1 },
              { type: "role", role: "button", name: "Log in", priority: 2 },
              { type: "text", value: "Log in", exact: false, priority: 3 },
            ],
            healing: {
              enabled: true,
              autoApprove: false,
              confidenceThreshold: 0.85,
            },
          },
        },
      },
      {
        id: uuid(),
        type: "wait",
        description: "Wait for navigation",
        config: { type: "navigation" },
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.run(
    `INSERT INTO components VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      loginComponent.id,
      loginComponent.name,
      loginComponent.description,
      loginComponent.type,
      JSON.stringify(loginComponent.parameters),
      JSON.stringify(loginComponent.steps),
      loginComponent.createdAt.toISOString(),
      loginComponent.updatedAt.toISOString(),
    ]
  );

  console.log(`✅ Created 1 component\n`);

  // ==================== FEATURES & SCENARIOS ====================
  console.log("🎯 Creating features and scenarios...");

  // E-commerce Features
  const cartFeature: Feature = {
    id: uuid(),
    serviceId: ecommerceService.id,
    name: "Shopping Cart",
    description: "Add, remove, and checkout items",
    owners: ["qa@testforge.com"],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const productFeature: Feature = {
    id: uuid(),
    serviceId: ecommerceService.id,
    name: "Product Catalog",
    description: "Browse and search products",
    owners: ["qa@testforge.com"],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Admin Features
  const userMgmtFeature: Feature = {
    id: uuid(),
    serviceId: adminService.id,
    name: "User Management",
    description: "Create, edit, delete users",
    owners: ["admin@testforge.com"],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.run(
    `INSERT INTO features VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      cartFeature.id,
      cartFeature.serviceId,
      cartFeature.name,
      cartFeature.description,
      JSON.stringify(cartFeature.owners),
      cartFeature.createdAt.toISOString(),
      cartFeature.updatedAt.toISOString(),
    ]
  );

  await db.run(
    `INSERT INTO features VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      productFeature.id,
      productFeature.serviceId,
      productFeature.name,
      productFeature.description,
      JSON.stringify(productFeature.owners),
      productFeature.createdAt.toISOString(),
      productFeature.updatedAt.toISOString(),
    ]
  );

  await db.run(
    `INSERT INTO features VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userMgmtFeature.id,
      userMgmtFeature.serviceId,
      userMgmtFeature.name,
      userMgmtFeature.description,
      JSON.stringify(userMgmtFeature.owners),
      userMgmtFeature.createdAt.toISOString(),
      userMgmtFeature.updatedAt.toISOString(),
    ]
  );

  console.log(`✅ Created 3 features\n`);

  // ==================== SCENARIOS ====================
  console.log("📝 Creating scenarios...");

  // Scenario 1: Add to Cart
  const addToCartScenario: Scenario = {
    id: uuid(),
    featureId: cartFeature.id,
    name: "Add Item to Cart",
    description: "User adds a product to their shopping cart",
    tags: ["smoke", "critical"],
    priority: "critical",
    variables: [
      {
        name: "productName",
        type: "string",
        defaultValue: "Wireless Headphones",
        description: "Name of product to add",
      },
    ],
    steps: [
      {
        id: uuid(),
        type: "navigate",
        description: "Go to products page",
        config: { url: "/products" },
      },
      {
        id: uuid(),
        type: "click",
        description: "Click on product",
        config: {
          locator: {
            displayName: "Product Card",
            strategies: [
              { type: "testId", value: "product-wireless-headphones", priority: 1 },
              { type: "text", value: "{{productName}}", exact: false, priority: 2 },
            ],
            healing: {
              enabled: true,
              autoApprove: false,
              confidenceThreshold: 0.9,
            },
          },
        },
      },
      {
        id: uuid(),
        type: "click",
        description: "Click 'Add to Cart' button",
        config: {
          locator: {
            displayName: "Add to Cart Button",
            strategies: [
              { type: "testId", value: "add-to-cart-btn", priority: 1 },
              { type: "role", role: "button", name: "Add to Cart", priority: 2 },
              { type: "text", value: "Add to Cart", exact: true, priority: 3 },
            ],
            healing: {
              enabled: true,
              autoApprove: true,
              confidenceThreshold: 0.9,
            },
          },
        },
      },
      {
        id: uuid(),
        type: "assert",
        description: "Verify success message",
        config: {
          type: "visible",
          locator: {
            displayName: "Success Toast",
            strategies: [
              { type: "testId", value: "toast-success", priority: 1 },
              { type: "role", role: "status", priority: 2 },
              { type: "text", value: "Added to cart", exact: false, priority: 3 },
            ],
            healing: {
              enabled: true,
              autoApprove: true,
              confidenceThreshold: 0.85,
            },
          },
        },
      },
    ],
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Scenario 2: Checkout Flow (uses Login component)
  const checkoutScenario: Scenario = {
    id: uuid(),
    featureId: cartFeature.id,
    name: "Complete Checkout Process",
    description: "User logs in and completes checkout",
    tags: ["regression", "e2e"],
    priority: "high",
    variables: [
      {
        name: "userEmail",
        type: "string",
        defaultValue: "test@example.com",
      },
      {
        name: "userPassword",
        type: "string",
        defaultValue: "Test123!",
      },
    ],
    steps: [
      {
        id: uuid(),
        type: "component",
        description: "Login as test user",
        config: {
          componentId: loginComponent.id,
          parameters: {
            email: "{{userEmail}}",
            password: "{{userPassword}}",
          },
        },
      },
      {
        id: uuid(),
        type: "navigate",
        description: "Go to cart",
        config: { url: "/cart" },
      },
      {
        id: uuid(),
        type: "click",
        description: "Click checkout button",
        config: {
          locator: {
            displayName: "Checkout Button",
            strategies: [
              { type: "testId", value: "checkout-btn", priority: 1 },
              { type: "role", role: "button", name: "Checkout", priority: 2 },
            ],
            healing: {
              enabled: true,
              autoApprove: true,
              confidenceThreshold: 0.9,
            },
          },
        },
      },
      {
        id: uuid(),
        type: "assert",
        description: "Verify on checkout page",
        config: {
          type: "url",
          expected: "/checkout",
        },
      },
    ],
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Scenario 3: Product Search with API
  const productSearchScenario: Scenario = {
    id: uuid(),
    featureId: productFeature.id,
    name: "Search Products via API and UI",
    description: "Test product search via API and verify UI",
    tags: ["api", "integration"],
    priority: "medium",
    variables: [
      {
        name: "searchTerm",
        type: "string",
        defaultValue: "laptop",
      },
    ],
    steps: [
      {
        id: uuid(),
        type: "api-request",
        description: "Search products via API",
        config: {
          method: "GET",
          url: "/api/products?q={{searchTerm}}",
          saveResponseAs: "searchResults",
        },
      },
      {
        id: uuid(),
        type: "api-assert",
        description: "Verify API response status",
        config: {
          type: "status",
          status: 200,
          responseRef: "searchResults",
        },
      },
      {
        id: uuid(),
        type: "api-assert",
        description: "Verify results array exists",
        config: {
          type: "body",
          path: "data",
          operator: "exists",
          responseRef: "searchResults",
        },
      },
      {
        id: uuid(),
        type: "navigate",
        description: "Go to products page",
        config: { url: "/products?q={{searchTerm}}" },
      },
      {
        id: uuid(),
        type: "assert",
        description: "Verify search results displayed",
        config: {
          type: "visible",
          locator: {
            displayName: "Search Results",
            strategies: [
              { type: "testId", value: "search-results", priority: 1 },
              { type: "css", selector: ".product-list", priority: 2 },
            ],
            healing: {
              enabled: true,
              autoApprove: true,
              confidenceThreshold: 0.9,
            },
          },
        },
      },
    ],
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Scenario 4: Admin - Create User
  const createUserScenario: Scenario = {
    id: uuid(),
    featureId: userMgmtFeature.id,
    name: "Create New User",
    description: "Admin creates a new user account",
    tags: ["admin", "critical"],
    priority: "high",
    variables: [
      {
        name: "newUserEmail",
        type: "string",
        defaultValue: "newuser@example.com",
      },
      {
        name: "newUserName",
        type: "string",
        defaultValue: "John Doe",
      },
    ],
    steps: [
      {
        id: uuid(),
        type: "component",
        description: "Login as admin",
        config: {
          componentId: loginComponent.id,
          parameters: {
            email: "admin@example.com",
            password: "Admin123!",
          },
        },
      },
      {
        id: uuid(),
        type: "navigate",
        description: "Go to users page",
        config: { url: "/admin/users" },
      },
      {
        id: uuid(),
        type: "click",
        description: "Click 'New User' button",
        config: {
          locator: {
            displayName: "New User Button",
            strategies: [
              { type: "testId", value: "new-user-btn", priority: 1 },
              { type: "role", role: "button", name: "New User", priority: 2 },
            ],
            healing: {
              enabled: true,
              autoApprove: true,
              confidenceThreshold: 0.9,
            },
          },
        },
      },
      {
        id: uuid(),
        type: "fill",
        description: "Enter user email",
        config: {
          locator: {
            displayName: "Email Field",
            strategies: [
              { type: "testId", value: "user-email", priority: 1 },
              { type: "label", value: "Email", priority: 2 },
            ],
            healing: {
              enabled: true,
              autoApprove: true,
              confidenceThreshold: 0.9,
            },
          },
          value: "{{newUserEmail}}",
        },
      },
      {
        id: uuid(),
        type: "fill",
        description: "Enter user name",
        config: {
          locator: {
            displayName: "Name Field",
            strategies: [
              { type: "testId", value: "user-name", priority: 1 },
              { type: "label", value: "Full Name", priority: 2 },
            ],
            healing: {
              enabled: true,
              autoApprove: true,
              confidenceThreshold: 0.9,
            },
          },
          value: "{{newUserName}}",
        },
      },
      {
        id: uuid(),
        type: "click",
        description: "Click save button",
        config: {
          locator: {
            displayName: "Save Button",
            strategies: [
              { type: "testId", value: "save-user-btn", priority: 1 },
              { type: "role", role: "button", name: "Save", priority: 2 },
            ],
            healing: {
              enabled: true,
              autoApprove: true,
              confidenceThreshold: 0.9,
            },
          },
        },
      },
      {
        id: uuid(),
        type: "assert",
        description: "Verify success message",
        config: {
          type: "text",
          locator: {
            displayName: "Success Message",
            strategies: [
              { type: "testId", value: "success-toast", priority: 1 },
              { type: "role", role: "status", priority: 2 },
            ],
            healing: {
              enabled: true,
              autoApprove: true,
              confidenceThreshold: 0.85,
            },
          },
          expected: "User created successfully",
        },
      },
    ],
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Insert scenarios
  for (const scenario of [
    addToCartScenario,
    checkoutScenario,
    productSearchScenario,
    createUserScenario,
  ]) {
    await db.run(
      `INSERT INTO scenarios VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        scenario.id,
        scenario.featureId,
        scenario.name,
        scenario.description,
        JSON.stringify(scenario.tags),
        scenario.priority,
        JSON.stringify(scenario.variables),
        JSON.stringify(scenario.steps),
        scenario.version,
        scenario.createdAt.toISOString(),
        scenario.updatedAt.toISOString(),
      ]
    );
  }

  console.log(`✅ Created 4 scenarios\n`);

  // Summary
  console.log("═".repeat(60));
  console.log("🎉 Seed completed successfully!\n");
  console.log("Summary:");
  console.log(`  • 2 Services`);
  console.log(`  • 3 Features`);
  console.log(`  • 4 Scenarios`);
  console.log(`  • 1 Reusable Component (Login)`);
  console.log("\n📚 Sample Data:");
  console.log(`  • E-commerce Platform: Shopping Cart, Product Catalog`);
  console.log(`  • Admin Portal: User Management`);
  console.log("═".repeat(60));

  await db.close();
}

// Run seed
seed().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
