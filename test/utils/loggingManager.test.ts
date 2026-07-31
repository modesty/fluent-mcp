/**
 * Tests for LoggingManager
 */
import { LoggingManager } from "../../src/utils/loggingManager.js";
import { ServerStatus } from "../../src/types.js";
import logger from "../../src/utils/logger.js";

// Mock the logger
jest.mock("../../src/utils/logger.js", () => {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    notice: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    critical: jest.fn(),
    alert: jest.fn(),
    emergency: jest.fn(),
    __esModule: true,
    default: {
      debug: jest.fn(),
      info: jest.fn(),
      notice: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      critical: jest.fn(),
      alert: jest.fn(),
      emergency: jest.fn(),
    }
  };
});

describe("LoggingManager", () => {
  let loggingManager: LoggingManager;
  
  beforeEach(() => {
    jest.clearAllMocks();
    loggingManager = new LoggingManager();
  });

  test("should log server starting", () => {
    // Act
    loggingManager.logServerStarting();
    
    // Assert
    expect(logger.info).toHaveBeenCalledWith(
      "Starting MCP server...",
      expect.objectContaining({ version: expect.any(String) })
    );
  });

  test.each([
    ["authenticated", "info"],
    ["skipped", "debug"],
    ["not_authenticated", "notice"],
    ["validation_error", "warn"],
  ] as const)("should log %s auth status at %s severity", (status, method) => {
    loggingManager.logAuthValidationResult({
      status,
      message: `Auth status: ${status}`,
      timestamp: "2026-07-29T00:00:00.000Z",
      alias: "dev",
      host: "dev.example.com",
      authType: "oauth",
      actionRequired: "now-sdk auth --add https://dev.example.com",
    });

    expect(logger[method]).toHaveBeenCalledWith(
      `Auth status: ${status}`,
      {
        status,
        timestamp: "2026-07-29T00:00:00.000Z",
        alias: "dev",
        host: "dev.example.com",
        authType: "oauth",
        actionRequired: "now-sdk auth --add https://dev.example.com",
      }
    );
  });

  test("should log server started", () => {
    // Act
    loggingManager.logServerStarted();
    
    // Assert
    expect(logger.info).toHaveBeenCalledWith("MCP server initialized and connected via stdio");
  });

  test("should log server already running", () => {
    // Act
    loggingManager.logServerAlreadyRunning();
    
    // Assert
    expect(logger.info).toHaveBeenCalledWith("MCP server is already running");
  });

  test("should log server not running", () => {
    // Act
    loggingManager.logServerNotRunning(ServerStatus.STOPPED);
    
    // Assert
    expect(logger.info).toHaveBeenCalledWith("MCP server is not running", { status: ServerStatus.STOPPED });
  });

  test("should log server stopping", () => {
    // Act
    loggingManager.logServerStopping();
    
    // Assert
    expect(logger.info).toHaveBeenCalledWith("Stopping MCP server...");
  });

  test("should log server stopped", () => {
    // Act
    loggingManager.logServerStopped();
    
    // Assert
    expect(logger.info).toHaveBeenCalledWith("MCP server stopped");
  });

  test("should log server start failed", () => {
    // Arrange
    const error = new Error("Test error");
    
    // Act
    loggingManager.logServerStartFailed(error, ServerStatus.STOPPED);
    
    // Assert
    expect(logger.error).toHaveBeenCalledWith(
      "Failed to start MCP server",
      error,
      { status: ServerStatus.STOPPED }
    );
  });

  test("should log server stop failed", () => {
    // Arrange
    const error = new Error("Test error");
    
    // Act
    loggingManager.logServerStopFailed(error, ServerStatus.STOPPING);
    
    // Assert
    expect(logger.error).toHaveBeenCalledWith(
      "Error stopping MCP server",
      error,
      { status: ServerStatus.STOPPING }
    );
  });

  test("should log resource listing failed", () => {
    // Arrange
    const error = new Error("Test error");
    
    // Act
    loggingManager.logResourceListingFailed(error);
    
    // Assert
    expect(logger.error).toHaveBeenCalledWith(
      "Error listing resources",
      error
    );
  });
});
