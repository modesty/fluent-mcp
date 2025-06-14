import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { SessionManager } from "../../utils/sessionManager";

// Mock fs, path, and os modules
jest.mock("node:fs", () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn()
}));

jest.mock("node:path", () => ({
  join: jest.fn().mockImplementation((...args) => args.join("/")),
  resolve: jest.fn().mockImplementation((...args) => args.join("/"))
}));

jest.mock("node:os", () => ({
  homedir: jest.fn().mockReturnValue("/mock-home")
}));

// Mock the logger
jest.mock("../../utils/logger", () => ({
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

    // Default mocks
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.readFileSync as jest.Mock).mockReturnValue("{}");
  });

  test("should create .fluent directory if it doesn't exist", () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    
    SessionManager.getInstance();
    
    expect(os.homedir).toHaveBeenCalled();
    expect(path.join).toHaveBeenCalledWith("/mock-home", ".fluent");
    expect(fs.mkdirSync).toHaveBeenCalled();
  });

  test("should not create .fluent directory if it exists", () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    
    SessionManager.getInstance();
    
    expect(os.homedir).toHaveBeenCalled();
    expect(path.join).toHaveBeenCalledWith("/mock-home", ".fluent");
    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });

  test("should load session data if file exists", () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
      workingDirectory: "/test-dir"
    }));
    
    const manager = SessionManager.getInstance();
    
    expect(fs.readFileSync).toHaveBeenCalled();
    expect(manager.getWorkingDirectory()).toBe("/test-dir");
  });

  test("should set and save working directory", () => {
    const manager = SessionManager.getInstance();
    
    manager.setWorkingDirectory("/new-dir");
    
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(manager.getWorkingDirectory()).toBe("/new-dir");
  });

  test("should clear session data", () => {
    const manager = SessionManager.getInstance();
    
    manager.setWorkingDirectory("/test-dir");
    expect(manager.getWorkingDirectory()).toBe("/test-dir");
    
    manager.clearSession();
    
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(manager.getWorkingDirectory()).toBeUndefined();
  });
});
