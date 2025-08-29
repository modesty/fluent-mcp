import { FluentAppValidator } from "../../src/utils/fluentAppValidator.js";
import fs from "node:fs";
import path from "node:path";

// Mock the fs and path modules
jest.mock("node:fs", () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

jest.mock("node:path", () => ({
  join: jest.fn((dir, file) => `${dir}/${file}`),
}));

// Mock the logger
jest.mock("../../src/utils/logger.js", () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("FluentAppValidator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should detect Fluent app from now.config.json", async () => {
    // Mock file existence
    jest.spyOn(fs, "existsSync").mockImplementation((filePath) => {
      return String(filePath) === "/test-dir/now.config.json";
    });

    // Mock file content
    jest.spyOn(fs, "readFileSync").mockImplementation((filePath, encoding) => {
      if (String(filePath) === "/test-dir/now.config.json") {
        return JSON.stringify({
          scope: "x_test_scope",
          name: "test-app",
        });
      }
      throw new Error("File not found");
    });

    // Mock path.join
    jest.spyOn(path, "join").mockImplementation((dir, file) => {
      return `${dir}/${file}`;
    });

    const result = await FluentAppValidator.checkFluentAppExists("/test-dir");
    expect(result.hasApp).toBe(true);
    expect(result.scopeName).toBe("x_test_scope");
    expect(result.packageName).toBe("test-app");
  });

  test("should detect Fluent app from package.json with ServiceNow SDK dependency", async () => {
    // Mock file existence
    jest.spyOn(fs, "existsSync").mockImplementation((filePath) => {
      if (String(filePath) === "/test-dir/now.config.json") {
        return false;
      }
      if (String(filePath) === "/test-dir/package.json") {
        return true;
      }
      return false;
    });

    // Mock file content
    jest.spyOn(fs, "readFileSync").mockImplementation((filePath, encoding) => {
      if (String(filePath) === "/test-dir/package.json") {
        return JSON.stringify({
          name: "test-app",
          dependencies: {
            "@servicenow/sdk": "3.0.3",
          },
        });
      }
      throw new Error("File not found");
    });

    const result = await FluentAppValidator.checkFluentAppExists("/test-dir");
    expect(result.hasApp).toBe(true);
    expect(result.packageName).toBe("test-app");
  });

  test("should return hasApp=false when no Fluent app is detected", async () => {
    // Mock file existence - no config files
    jest.spyOn(fs, "existsSync").mockImplementation((filePath) => {
      return false;
    });

    const result = await FluentAppValidator.checkFluentAppExists("/empty-dir");
    expect(result.hasApp).toBe(false);
    expect(result.scopeName).toBeUndefined();
    expect(result.packageName).toBeUndefined();
  });

  test("should handle errors when reading file", async () => {
    // Mock file existence
    jest.spyOn(fs, "existsSync").mockImplementation((filePath) => {
      return String(filePath) === "/test-dir/now.config.json";
    });

    // Mock readFileSync to throw error
    jest.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("Test error reading file");
    });

    const result = await FluentAppValidator.checkFluentAppExists("/test-dir");
    expect(result.hasApp).toBe(true); // We know the file exists, so it's considered an app
    expect(result.scopeName).toBe("unknown");
    expect(result.packageName).toBe("unknown");
  });
});
