import { CommandProcessor, CommandResult } from "../../src/utils/types.js";
import { AuthCommand } from "../../src/tools/commands/authCommand.js";
import { SessionManager } from "../../src/utils/sessionManager.js";

// Mock SessionManager
jest.mock("../../src/utils/sessionManager.js", () => ({
  SessionManager: {
    getInstance: jest.fn().mockReturnValue({
      getWorkingDirectory: jest.fn().mockReturnValue("/test-working-dir"),
    }),
  },
}));

// Create mock processor factory for tests
function createMockProcessor(): CommandProcessor {
  return {
    process: jest.fn().mockImplementation(async () => {
      return {
        success: true,
        output: "Mock auth command executed successfully",
        exitCode: 0,
      } as CommandResult;
    }),
    
    // Legacy execute method (to be removed after refactoring)
    execute: jest.fn().mockImplementation(async () => {
      return {
        success: true,
        output: "Mock auth command executed successfully",
        exitCode: 0,
      } as CommandResult;
    }),
  } as CommandProcessor;
}

describe("AuthCommand", () => {
  let authCommand: AuthCommand;
  let mockProcessor: CommandProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockProcessor = createMockProcessor();
    authCommand = new AuthCommand(mockProcessor);
  });

  test("should have correct properties", () => {
    expect(authCommand.name).toBe("prepare_fluent_auth");
    expect(authCommand.description).toBe(
      "Prepare shell command for Fluent (ServiceNow SDK) authentication to <instance_url> with credential profiles"
    );
    // Check for expected arguments
    expect(authCommand.arguments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "add" }),
        expect.objectContaining({ name: "instanceUrl" }),
        expect.objectContaining({ name: "list" })
      ])
    );
  });

  test("should execute auth command with add action", async () => {
    // Test args for add action
    const args = {
      action: "add",
      id: "test-instance",
      username: "test-user",
      password: "test-pass",
      url: "https://test-instance.service-now.com"
    };
    
    const result = await authCommand.execute(args);
    
    // Verify process was called with correct arguments
    expect(mockProcessor.process).toHaveBeenCalledWith(
      "npx",
      ["now-sdk", "auth"],
      false,
      "/test-working-dir"
    );
    
    expect(result.success).toBe(true);
  });
});
