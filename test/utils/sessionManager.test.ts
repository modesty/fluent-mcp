import { SessionManager } from "../../src/utils/sessionManager.js";

// Mock the logger
jest.mock("../../src/utils/logger.js", () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe("SessionManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the singleton instance before each test
    (SessionManager as any).instance = undefined;
  });

  test("should initialize with empty session data", () => {
    const manager = SessionManager.getInstance();
    expect(manager.getWorkingDirectory()).toBeUndefined();
  });

  test("should maintain singleton instance", () => {
    const manager1 = SessionManager.getInstance();
    const manager2 = SessionManager.getInstance();
    expect(manager1).toBe(manager2);
  });

  test("should set working directory", () => {
    const manager = SessionManager.getInstance();
    
    manager.setWorkingDirectory("/new-dir");
    expect(manager.getWorkingDirectory()).toBe("/new-dir");
  });

  test("should clear session data", () => {
    const manager = SessionManager.getInstance();
    
    manager.setWorkingDirectory("/test-dir");
    expect(manager.getWorkingDirectory()).toBe("/test-dir");
    
    manager.clearSession();
    expect(manager.getWorkingDirectory()).toBeUndefined();
  });
  
  test("should reset session on new instance", () => {
    // Get first instance and set working directory
    const manager1 = SessionManager.getInstance();
    manager1.setWorkingDirectory("/test-dir");
    
    // Force new instance
    (SessionManager as any).instance = undefined;
    
    // Get new instance and verify it starts with empty data
    const manager2 = SessionManager.getInstance();
    expect(manager2.getWorkingDirectory()).toBeUndefined();
  });
});
