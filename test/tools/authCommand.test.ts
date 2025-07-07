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

// Create mock CLICmdWriter for tests
function createMockCmdWriter(): CommandProcessor {
  return {
    // Mock process method that returns a generated command text
    process: jest.fn().mockImplementation(async (command, args) => {
      const argsText = args.join(' ');
      return {
        success: true,
        output: `${command} ${argsText}`,
        exitCode: 0,
      } as CommandResult;
    }),
  } as CommandProcessor;
}

describe("AuthCommand", () => {
  let authCommand: AuthCommand;
  let mockCmdWriter: CommandProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockCmdWriter = createMockCmdWriter();
    authCommand = new AuthCommand(mockCmdWriter);
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
    
    // Continue to call execute, which internally calls commandProcessor.process
    const result = await authCommand.execute(args);
    
    // Verify CLICmdWriter's process method was called with correct arguments
    expect(mockCmdWriter.process).toHaveBeenCalledWith(
      "npx",
      expect.arrayContaining(["now-sdk", "auth"]),
      false,
      "/test-working-dir"
    );
    
    expect(result.success).toBe(true);
  });
  
  // Add a comment explaining the relationship between execute and process
  test("should handle relationship between execute and process methods", () => {
    // The command.execute method should call the commandProcessor.process method
    // This is a key part of the refactoring to ensure AuthCommand uses CLICmdWriter properly
    
    const args = { list: true };
    
    authCommand.execute(args);
    
    // Verify the process method of the command processor was called
    expect(mockCmdWriter.process).toHaveBeenCalled();
  });
  
  test("should pass proper auth parameters to the processor", async () => {
    const args = {
      add: true,
      instanceUrl: "https://dev123.service-now.com",
      type: "basic",
      alias: "dev-instance" 
    };
    
    await authCommand.execute(args);
    
    // Verify the processor received all the necessary auth parameters
    expect(mockCmdWriter.process).toHaveBeenCalledWith(
      "npx", 
      expect.arrayContaining([
        "now-sdk", 
        "auth",
        "--add",
        "https://dev123.service-now.com",
        "--type",
        "basic",
        "--alias",
        "dev-instance"
      ]),
      false,
      "/test-working-dir"
    );
  });
});
