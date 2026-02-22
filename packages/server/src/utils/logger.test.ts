import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { Logger } from "./logger";

describe("Logger", () => {
  let logger: Logger;
  let consoleLogSpy: ReturnType<typeof mock>;
  let consoleWarnSpy: ReturnType<typeof mock>;
  let consoleErrorSpy: ReturnType<typeof mock>;

  beforeEach(() => {
    logger = new Logger("debug");
    consoleLogSpy = mock(() => {});
    consoleWarnSpy = mock(() => {});
    consoleErrorSpy = mock(() => {});

    console.log = consoleLogSpy;
    console.warn = consoleWarnSpy;
    console.error = consoleErrorSpy;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("log levels", () => {
    it("should log debug messages when level is debug", () => {
      logger.setLevel("debug");
      logger.debug("test message");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleLogSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("DEBUG");
      expect(loggedMessage).toContain("test message");
    });

    it("should log info messages", () => {
      logger.info("info message");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleLogSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("INFO");
      expect(loggedMessage).toContain("info message");
    });

    it("should log warn messages", () => {
      logger.warn("warning message");

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleWarnSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("WARN");
      expect(loggedMessage).toContain("warning message");
    });

    it("should log error messages", () => {
      logger.error("error message");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("ERROR");
      expect(loggedMessage).toContain("error message");
    });

    it("should not log debug messages when level is info", () => {
      logger.setLevel("info");
      logger.debug("debug message");
      logger.info("info message");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleLogSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("INFO");
    });

    it("should only log error messages when level is error", () => {
      logger.setLevel("error");
      logger.debug("debug");
      logger.info("info");
      logger.warn("warn");
      logger.error("error");

      expect(consoleLogSpy).toHaveBeenCalledTimes(0);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(0);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("context", () => {
    it("should include context in log messages", () => {
      logger.info("message", { userId: "123", action: "login" });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleLogSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("message");
      expect(loggedMessage).toContain('"userId":"123"');
      expect(loggedMessage).toContain('"action":"login"');
    });

    it("should handle empty context", () => {
      logger.info("message without context");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleLogSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("message without context");
      expect(loggedMessage).not.toContain("{");
    });

    it("should handle complex context objects", () => {
      logger.error("error", {
        error: { message: "failed", code: 500 },
        metadata: { timestamp: "2024-01-01" },
      });

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("error");
      expect(loggedMessage).toContain('"message":"failed"');
      expect(loggedMessage).toContain('"code":500');
    });
  });

  describe("child logger", () => {
    it("should create child logger with injected context", () => {
      const childLogger = logger.child({ service: "api", version: "1.0" });
      childLogger.info("request received");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleLogSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("request received");
      expect(loggedMessage).toContain('"service":"api"');
      expect(loggedMessage).toContain('"version":"1.0"');
    });

    it("should merge child context with additional context", () => {
      const childLogger = logger.child({ service: "api" });
      childLogger.info("request", { method: "GET", path: "/users" });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleLogSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('"service":"api"');
      expect(loggedMessage).toContain('"method":"GET"');
      expect(loggedMessage).toContain('"path":"/users"');
    });

    it("should override child context with additional context", () => {
      const childLogger = logger.child({ service: "api", version: "1.0" });
      childLogger.info("update", { version: "2.0" });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleLogSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('"service":"api"');
      expect(loggedMessage).toContain('"version":"2.0"');
      expect(loggedMessage).not.toContain('"version":"1.0"');
    });

    it("should inherit minimum log level from parent", () => {
      logger.setLevel("warn");
      const childLogger = logger.child({ service: "api" });

      childLogger.debug("debug");
      childLogger.info("info");
      childLogger.warn("warn");

      expect(consoleLogSpy).toHaveBeenCalledTimes(0);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("timestamp format", () => {
    it("should include ISO timestamp in log output", () => {
      logger.info("test");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleLogSpy.mock.calls[0][0];

      // Should contain a timestamp in ISO format (e.g., 2024-01-01T00:00:00.000Z)
      expect(loggedMessage).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });
  });

  describe("level formatting", () => {
    it("should format log level with consistent width", () => {
      logger.debug("test");
      logger.info("test");
      logger.warn("test");
      logger.error("test");

      const debugMsg = consoleLogSpy.mock.calls[0][0];
      const infoMsg = consoleLogSpy.mock.calls[1][0];
      const warnMsg = consoleWarnSpy.mock.calls[0][0];
      const errorMsg = consoleErrorSpy.mock.calls[0][0];

      // All levels should be padded to same width
      expect(debugMsg).toContain("DEBUG");
      expect(infoMsg).toContain("INFO ");
      expect(warnMsg).toContain("WARN ");
      expect(errorMsg).toContain("ERROR");
    });
  });
});
