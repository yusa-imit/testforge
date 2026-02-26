/**
 * Backup and Restore Routes Tests
 *
 * Tests database export, import, and info endpoints
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import app from "../index";
import { setupTestDB } from "../test-helpers/setup";
import type { DuckDBDatabase } from "../db/database";

let _db: DuckDBDatabase;
let teardown: () => void;

beforeEach(async () => {
  ({ db: _db, teardown } = await setupTestDB());
  process.env.NODE_ENV = "test";
});

afterEach(() => {
  teardown();
});

describe("Backup Routes", () => {

  describe("GET /api/backup/info", () => {
    it("should return database statistics", async () => {
      const res = await app.request("/api/backup/info");

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data).toHaveProperty("counts");
      expect(data.counts).toHaveProperty("services");
      expect(data.counts).toHaveProperty("features");
      expect(data.counts).toHaveProperty("scenarios");
      expect(data.counts).toHaveProperty("components");
      expect(data.counts).toHaveProperty("runs");
      expect(data.counts).toHaveProperty("healingRecords");
      expect(data.counts).toHaveProperty("elementRegistry");
      expect(data).toHaveProperty("timestamp");
    });

    it("should return zero counts for empty database", async () => {
      const res = await app.request("/api/backup/info");

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.counts.services).toBe(0);
      expect(data.counts.features).toBe(0);
      expect(data.counts.scenarios).toBe(0);
      expect(data.counts.components).toBe(0);
    });

    it.skip("should return correct counts after creating entities", async () => {
      // Create a service
      await app.request("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Service",
          description: "Test",
          baseUrl: "http://localhost",
          defaultTimeout: 30000,
        }),
      });

      // Create a component
      await app.request("/api/components", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Component",
          description: "Test",
          type: "action",
          parameters: [],
          steps: [],
        }),
      });

      const res = await app.request("/api/backup/info");

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.counts.services).toBe(1);
      expect(data.counts.components).toBe(1);
    });
  });

  describe("GET /api/backup/export", () => {
    it("should export empty database", async () => {
      const res = await app.request("/api/backup/export");

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data).toHaveProperty("version");
      expect(data).toHaveProperty("timestamp");
      expect(data).toHaveProperty("metadata");
      expect(data).toHaveProperty("data");

      expect(data.version).toBe("1.0.0");
      expect(data.metadata.servicesCount).toBe(0);
      expect(data.data.services).toEqual([]);
    });

    it.skip("should export database with services and features", async () => {
      // Create service
      const serviceRes = await app.request("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "E-commerce",
          description: "Online store",
          baseUrl: "http://localhost",
          defaultTimeout: 30000,
        }),
      });
      const service = await serviceRes.json();

      // Create feature
      await app.request("/api/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          name: "Checkout",
          description: "Payment flow",
          owners: ["qa@example.com"],
        }),
      });

      const res = await app.request("/api/backup/export");

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.metadata.servicesCount).toBe(1);
      expect(data.metadata.featuresCount).toBe(1);
      expect(data.data.services).toHaveLength(1);
      expect(data.data.features).toHaveLength(1);
      expect(data.data.services[0].name).toBe("E-commerce");
      expect(data.data.features[0].name).toBe("Checkout");
    });

    it("should include Content-Disposition header for download", async () => {
      const res = await app.request("/api/backup/export");

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Disposition")).toContain("attachment");
      expect(res.headers.get("Content-Disposition")).toContain("testforge-backup-");
      expect(res.headers.get("Content-Type")).toBe("application/json");
    });

    it("should exclude runs when includeRuns=false", async () => {
      const res = await app.request("/api/backup/export?includeRuns=false");

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.data.runs).toEqual([]);
      expect(data.data.stepResults).toEqual([]);
      expect(data.metadata.runsCount).toBe(0);
    });

    it("should exclude healing records when includeHealing=false", async () => {
      const res = await app.request("/api/backup/export?includeHealing=false");

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.data.healingRecords).toEqual([]);
      expect(data.metadata.healingRecordsCount).toBe(0);
    });
  });

  describe("POST /api/backup/import", () => {
    it("should reject invalid backup format", async () => {
      const res = await app.request("/api/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invalid: "data" }),
      });

      expect(res.status).toBe(400);
    });

    it("should import valid backup in replace mode", async () => {
      const backup = {
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        metadata: {
          servicesCount: 1,
          featuresCount: 0,
          scenariosCount: 0,
          componentsCount: 0,
          runsCount: 0,
          healingRecordsCount: 0,
        },
        data: {
          services: [
            {
              id: "test-id",
              name: "Imported Service",
              description: "From backup",
              baseUrl: "http://example.com",
              defaultTimeout: 30000,
            },
          ],
          features: [],
          scenarios: [],
          components: [],
          runs: [],
          stepResults: [],
          healingRecords: [],
          elementRegistry: [],
        },
      };

      const res = await app.request("/api/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backup),
      });

      expect(res.status).toBe(200);
      const result = await res.json();

      expect(result.message).toBe("Database import completed");
      expect(result.summary.imported.services).toBe(1);
      expect(result.summary.mode).toBe("replace");

      // Verify service was imported
      const services = await app.request("/api/services");
      const servicesData = await services.json();
      expect(servicesData.success).toBe(true);
      expect(servicesData.data).toHaveLength(1);
      expect(servicesData.data[0].name).toBe("Imported Service");
    });

    it.skip("should import multiple entities correctly", async () => {
      const backup = {
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        metadata: {
          servicesCount: 2,
          featuresCount: 1,
          scenariosCount: 0,
          componentsCount: 1,
          runsCount: 0,
          healingRecordsCount: 0,
        },
        data: {
          services: [
            {
              id: "service-1",
              name: "Service 1",
              description: "First",
              baseUrl: "http://example.com",
              defaultTimeout: 30000,
            },
            {
              id: "service-2",
              name: "Service 2",
              description: "Second",
              baseUrl: "http://example.com",
              defaultTimeout: 30000,
            },
          ],
          features: [
            {
              id: "feature-1",
              serviceId: "service-1",
              name: "Feature 1",
              description: "Test feature",
              owners: ["test@example.com"],
            },
          ],
          scenarios: [],
          components: [
            {
              id: "component-1",
              name: "Component 1",
              description: "Test component",
              type: "action",
              parameters: [],
              steps: [],
            },
          ],
          runs: [],
          stepResults: [],
          healingRecords: [],
          elementRegistry: [],
        },
      };

      const res = await app.request("/api/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backup),
      });

      expect(res.status).toBe(200);
      const result = await res.json();

      expect(result.summary.imported.services).toBe(2);
      expect(result.summary.imported.features).toBe(1);
      expect(result.summary.imported.components).toBe(1);
    });

    it.skip("should skip existing entities in merge mode", async () => {
      // Create initial service
      await app.request("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Existing Service",
          description: "Already exists",
          baseUrl: "http://localhost",
          defaultTimeout: 30000,
        }),
      });

      const servicesRes = await app.request("/api/services");
      const servicesData = await servicesRes.json();
      const existingId = servicesData.data[0].id;

      // Try to import with same ID
      const backup = {
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        metadata: {
          servicesCount: 2,
          featuresCount: 0,
          scenariosCount: 0,
          componentsCount: 0,
          runsCount: 0,
          healingRecordsCount: 0,
        },
        data: {
          services: [
            {
              id: existingId,
              name: "Should be skipped",
              description: "Duplicate",
              baseUrl: "http://example.com",
              defaultTimeout: 30000,
            },
            {
              id: "new-service-id",
              name: "New Service",
              description: "Should import",
              baseUrl: "http://example.com",
              defaultTimeout: 30000,
            },
          ],
          features: [],
          scenarios: [],
          components: [],
          runs: [],
          stepResults: [],
          healingRecords: [],
          elementRegistry: [],
        },
      };

      const res = await app.request("/api/backup/import?mode=merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backup),
      });

      expect(res.status).toBe(200);
      const result = await res.json();

      expect(result.summary.mode).toBe("merge");
      expect(result.summary.skipped.services).toBe(1);
      expect(result.summary.imported.services).toBe(1);

      // Verify original service unchanged
      const updatedServices = await app.request("/api/services");
      const updatedServicesData = await updatedServices.json();
      const original = updatedServicesData.data.find((s: any) => s.id === existingId);
      expect(original.name).toBe("Existing Service");
    });

    it("should handle empty backup gracefully", async () => {
      const backup = {
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        metadata: {
          servicesCount: 0,
          featuresCount: 0,
          scenariosCount: 0,
          componentsCount: 0,
          runsCount: 0,
          healingRecordsCount: 0,
        },
        data: {
          services: [],
          features: [],
          scenarios: [],
          components: [],
          runs: [],
          stepResults: [],
          healingRecords: [],
          elementRegistry: [],
        },
      };

      const res = await app.request("/api/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backup),
      });

      expect(res.status).toBe(200);
      const result = await res.json();

      expect(result.summary.imported.services).toBe(0);
      expect(result.summary.imported.features).toBe(0);
    });
  });

  describe("Export and Import Round-Trip", () => {
    it.skip("should preserve data through export-import cycle", async () => {
      // Create test data
      const serviceRes = await app.request("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Round Trip Service",
          description: "Test round trip",
          baseUrl: "http://localhost",
          defaultTimeout: 30000,
        }),
      });
      const service = await serviceRes.json();

      await app.request("/api/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          name: "Round Trip Feature",
          description: "Test",
          owners: ["test@example.com"],
        }),
      });

      // Export
      const exportRes = await app.request("/api/backup/export");
      const exportData = await exportRes.json();

      // Verify export has feature data
      expect(exportData.metadata.featuresCount).toBe(1);
      expect(exportData.data.features).toHaveLength(1);

      // Clear and re-import - teardown and setup fresh DB
      teardown();
      ({ db: _db, teardown } = await setupTestDB());

      const importRes = await app.request("/api/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exportData),
      });

      expect(importRes.status).toBe(200);

      // Verify data restored
      const servicesRes = await app.request("/api/services");
      const servicesData = await servicesRes.json();
      expect(servicesData.success).toBe(true);
      expect(servicesData.data).toHaveLength(1);
      expect(servicesData.data[0].name).toBe("Round Trip Service");

      const restoredServiceId = servicesData.data[0].id;
      const featuresRes = await app.request(`/api/services/${restoredServiceId}/features`);
      const featuresData = await featuresRes.json();
      expect(featuresData.success).toBe(true);
      expect(featuresData.data).toHaveLength(1);
      expect(featuresData.data[0].name).toBe("Round Trip Feature");
    });
  });
});
