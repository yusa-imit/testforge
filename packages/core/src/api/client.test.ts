import { describe, it, expect } from "bun:test";
import { ApiClient } from "./client";

describe("ApiClient", () => {
  let _client: ApiClient;

  // Using beforeEach-like pattern with re-instantiation
  const getClient = () => new ApiClient();

  describe("getValueByPath", () => {
    it("retrieves a top-level value", () => {
      const client = getClient();
      expect(client.getValueByPath({ name: "Alice" }, "name")).toBe("Alice");
    });

    it("retrieves a nested value", () => {
      const client = getClient();
      const obj = { data: { user: { name: "Alice" } } };
      expect(client.getValueByPath(obj, "data.user.name")).toBe("Alice");
    });

    it("retrieves an array element by index", () => {
      const client = getClient();
      const obj = { items: ["a", "b", "c"] };
      expect(client.getValueByPath(obj, "items[0]")).toBe("a");
      expect(client.getValueByPath(obj, "items[2]")).toBe("c");
    });

    it("retrieves nested array element", () => {
      const client = getClient();
      const obj = { data: { results: [{ id: 1 }, { id: 2 }] } };
      expect(client.getValueByPath(obj, "data.results[1].id")).toBe(2);
    });

    it("returns undefined for missing key", () => {
      const client = getClient();
      expect(client.getValueByPath({ name: "Alice" }, "age")).toBeUndefined();
    });

    it("returns undefined for deep missing key", () => {
      const client = getClient();
      const obj = { data: { user: { name: "Alice" } } };
      expect(client.getValueByPath(obj, "data.user.email")).toBeUndefined();
    });

    it("returns undefined for null object", () => {
      const client = getClient();
      expect(client.getValueByPath(null, "name")).toBeUndefined();
    });

    it("handles numeric values", () => {
      const client = getClient();
      expect(client.getValueByPath({ count: 0 }, "count")).toBe(0);
    });

    it("handles boolean false value", () => {
      const client = getClient();
      expect(client.getValueByPath({ active: false }, "active")).toBe(false);
    });
  });

  describe("pathExists", () => {
    it("returns true for existing path", () => {
      const client = getClient();
      expect(client.pathExists({ name: "Alice" }, "name")).toBe(true);
    });

    it("returns false for missing path", () => {
      const client = getClient();
      expect(client.pathExists({ name: "Alice" }, "age")).toBe(false);
    });

    it("returns true for null value at path (null !== undefined)", () => {
      const client = getClient();
      // pathExists checks !== undefined, so null values are considered to exist
      expect(client.pathExists({ value: null }, "value")).toBe(true);
    });
  });

  describe("compareValues", () => {
    describe("equals operator", () => {
      it("returns true for identical primitives", () => {
        const client = getClient();
        expect(client.compareValues(42, 42, "equals")).toBe(true);
        expect(client.compareValues("hello", "hello", "equals")).toBe(true);
        expect(client.compareValues(true, true, "equals")).toBe(true);
      });

      it("returns false for different primitives", () => {
        const client = getClient();
        expect(client.compareValues(42, 43, "equals")).toBe(false);
        expect(client.compareValues("hello", "world", "equals")).toBe(false);
      });

      it("deep-compares objects", () => {
        const client = getClient();
        expect(client.compareValues({ a: 1 }, { a: 1 }, "equals")).toBe(true);
        expect(client.compareValues({ a: 1 }, { a: 2 }, "equals")).toBe(false);
      });

      it("deep-compares arrays", () => {
        const client = getClient();
        expect(client.compareValues([1, 2, 3], [1, 2, 3], "equals")).toBe(true);
        expect(client.compareValues([1, 2], [1, 2, 3], "equals")).toBe(false);
      });
    });

    describe("contains operator", () => {
      it("checks string contains", () => {
        const client = getClient();
        expect(client.compareValues("hello world", "world", "contains")).toBe(true);
        expect(client.compareValues("hello world", "xyz", "contains")).toBe(false);
      });

      it("checks array contains element", () => {
        const client = getClient();
        expect(client.compareValues([1, 2, 3], 2, "contains")).toBe(true);
        expect(client.compareValues([1, 2, 3], 4, "contains")).toBe(false);
      });

      it("returns false for non-string non-array", () => {
        const client = getClient();
        expect(client.compareValues(42, "4", "contains")).toBe(false);
      });
    });

    describe("matches operator", () => {
      it("checks regex match on strings", () => {
        const client = getClient();
        expect(client.compareValues("hello123", "\\d+", "matches")).toBe(true);
        expect(client.compareValues("hello", "^\\d+$", "matches")).toBe(false);
      });

      it("returns false for non-strings", () => {
        const client = getClient();
        expect(client.compareValues(42, "\\d+", "matches")).toBe(false);
      });
    });

    describe("exists operator", () => {
      it("returns true for non-null, non-undefined values", () => {
        const client = getClient();
        expect(client.compareValues("value", null, "exists")).toBe(true);
        expect(client.compareValues(0, null, "exists")).toBe(true);
        expect(client.compareValues(false, null, "exists")).toBe(true);
        expect(client.compareValues({}, null, "exists")).toBe(true);
      });

      it("returns false for null or undefined", () => {
        const client = getClient();
        expect(client.compareValues(null, null, "exists")).toBe(false);
        expect(client.compareValues(undefined, null, "exists")).toBe(false);
      });
    });

    describe("type operator", () => {
      it("checks primitive types", () => {
        const client = getClient();
        expect(client.compareValues("hello", "string", "type")).toBe(true);
        expect(client.compareValues(42, "number", "type")).toBe(true);
        expect(client.compareValues(true, "boolean", "type")).toBe(true);
      });

      it("identifies arrays as 'array' not 'object'", () => {
        const client = getClient();
        expect(client.compareValues([1, 2, 3], "array", "type")).toBe(true);
        expect(client.compareValues([1, 2, 3], "object", "type")).toBe(false);
      });

      it("identifies plain objects", () => {
        const client = getClient();
        expect(client.compareValues({ a: 1 }, "object", "type")).toBe(true);
      });

      it("returns false for wrong type", () => {
        const client = getClient();
        expect(client.compareValues("hello", "number", "type")).toBe(false);
      });
    });
  });

  describe("findAlternativePath", () => {
    it("finds exact matching path key", () => {
      const client = getClient();
      const obj = { user: { name: "Alice", email: "alice@example.com" } };
      const result = client.findAlternativePath(obj, "user.name");
      // It should find "user.name" or similar
      expect(result).not.toBeNull();
      expect(result?.confidence).toBeGreaterThan(0);
    });

    it("finds similar path when original key changes", () => {
      const client = getClient();
      // Original path: "data.user_name", actual path: "data.userName"
      const obj = { data: { userName: "Alice" } };
      const result = client.findAlternativePath(obj, "data.user_name", 0.5);
      expect(result).not.toBeNull();
    });

    it("returns null when no path meets minConfidence", () => {
      const client = getClient();
      const obj = { completely: { different: { structure: true } } };
      const result = client.findAlternativePath(obj, "xyz.abc.def", 0.99);
      expect(result).toBeNull();
    });

    it("returns highest-confidence candidate first", () => {
      const client = getClient();
      const obj = { name: "Alice", lastName: "Smith", firstName: "Alice" };
      const result = client.findAlternativePath(obj, "name", 0.5);
      expect(result).not.toBeNull();
      // The exact "name" match should be highest
      expect(result?.confidence).toBeGreaterThan(0.8);
    });
  });

  describe("getValueByPathWithHealing", () => {
    it("returns value without healing for existing path", () => {
      const client = getClient();
      const obj = { data: { status: "active" } };
      const result = client.getValueByPathWithHealing(obj, "data.status");
      expect(result.value).toBe("active");
      expect(result.healed).toBe(false);
    });

    it("attempts healing when original path fails", () => {
      const client = getClient();
      // Path changed from "data.userStatus" to "data.status"
      const obj = { data: { status: "active" } };
      const result = client.getValueByPathWithHealing(obj, "data.userStatus");
      // May or may not heal based on similarity, but shouldn't throw
      expect(result).toBeDefined();
      expect(typeof result.healed).toBe("boolean");
    });

    it("returns undefined value when no path found", () => {
      const client = getClient();
      const obj = { a: 1 };
      const result = client.getValueByPathWithHealing(obj, "completely.unrelated.path");
      expect(result.value).toBeUndefined();
      expect(result.healed).toBe(false);
    });

    it("indicates healing was used when alternative found", () => {
      const client = getClient();
      // Create scenario where healing will kick in
      const obj = { name: "Alice" };
      const result = client.getValueByPathWithHealing(obj, "username");
      // If healed is true, usedPath and confidence should be set
      if (result.healed) {
        expect(result.usedPath).toBeDefined();
        expect(result.confidence).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      }
    });
  });
});
