import { CommandResult } from "../../src/utils/types.js";
import { CLIExecutor } from "../../src/tools/cliCommandTools.js";
import { SessionAwareCLICommand } from "../../src/tools/commands/sessionAwareCommand.js";
import { SessionManager } from "../../src/utils/sessionManager.js";

// Mock the SessionManager
jest.mock("../../src/utils/sessionManager.js", () => {
  return {
    SessionManager: {
      getInstance: jest.fn().mockReturnValue({
        getWorkingDirectory: jest.fn().mockReturnValue("/test-working-dir"),
      }),
    },
  };
});

// Create a concrete implementation of SessionAwareCLICommand for testing
class TestSessionAwareCommand extends SessionAwareCLICommand {
  name = "test_command";
  description = "Test command for session aware commands";
  arguments = [];

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    const testArgs = ["test", "command", "args"];
    return this.executeWithSessionWorkingDirectory("test-command", testArgs);
  }
}

describe("SessionAwareCommand", () => {
  let sessionAwareCommand: TestSessionAwareCommand;
  let mockExecutor: CLIExecutor;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a mock executor
    mockExecutor = {
      execute: jest.fn().mockImplementation(() => {
        return Promise.resolve({
          success: true,
          output: "Mock command executed successfully",
          exitCode: 0,
        } as CommandResult);
      }),
    } as unknown as CLIExecutor;

    sessionAwareCommand = new TestSessionAwareCommand(mockExecutor);
  });

  test("should execute command with working directory from session", async () => {
    const result = await sessionAwareCommand.execute({});
    
    expect(SessionManager.getInstance().getWorkingDirectory).toHaveBeenCalled();
    expect(mockExecutor.execute).toHaveBeenCalledWith(
      "test-command",
      ["test", "command", "args"],
      false,
      "/test-working-dir"
    );
    expect(result.success).toBe(true);
  });

  test("should return error when no working directory is available", async () => {
    // Override the mock to return undefined working directory
    (SessionManager.getInstance().getWorkingDirectory as jest.Mock).mockReturnValueOnce(undefined);
    
    const result = await sessionAwareCommand.execute({});
    
    expect(SessionManager.getInstance().getWorkingDirectory).toHaveBeenCalled();
    expect(mockExecutor.execute).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("No working directory found");
  });

  test("should handle errors from executor", async () => {
    // Override the mock to throw an error
    (mockExecutor.execute as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Test execution error");
    });
    
    const result = await sessionAwareCommand.execute({});
    
    expect(result.success).toBe(false);
    expect(result.error?.message).toBe("Test execution error");
  });
});
