import { CommandProcessor, CommandResult } from "../../src/utils/types.js";
import { SessionAwareCLICommand } from "../../src/tools/commands/sessionAwareCommand.js";
import { SessionManager } from "../../src/utils/sessionManager.js";

jest.mock("../../src/utils/sessionManager.js", () => require('../mocks/index.js').createSessionManagerMock());
jest.mock("../../src/utils/rootContext.js", () => require('../mocks/index.js').createRootContextMock());

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
  let mockExecutor: CommandProcessor;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock processor
    mockExecutor = {
      process: jest.fn().mockImplementation(() => {
        return Promise.resolve({
          success: true,
          output: "Mock command executed successfully",
          exitCode: 0,
        } as CommandResult);
      }),
      execute: jest.fn().mockImplementation(() => {
        return Promise.resolve({
          success: true,
          output: "Mock command executed successfully",
          exitCode: 0,
        } as CommandResult);
      })
    } as CommandProcessor;

    sessionAwareCommand = new TestSessionAwareCommand(mockExecutor);
  });

  test("should execute command with working directory from session", async () => {
    const result = await sessionAwareCommand.execute({});

    expect(SessionManager.getInstance().getWorkingDirectory).toHaveBeenCalled();
    expect(mockExecutor.process).toHaveBeenCalledWith(
      "test-command",
      ["test", "command", "args"],
      false,
      "/mock/working/dir"
    );
    expect(result.success).toBe(true);
  });

  test("should return error when no working directory is available", async () => {
    // Override the mock to return undefined working directory
    (SessionManager.getInstance().getWorkingDirectory as jest.Mock).mockReturnValueOnce(undefined);
    // Mock resolveWorkingDirectory to return undefined (simulating no fallback available)
    const { resolveWorkingDirectory } = require("../../src/utils/rootContext.js");
    (resolveWorkingDirectory as jest.Mock).mockReturnValueOnce(undefined);

    const result = await sessionAwareCommand.execute({});

    expect(SessionManager.getInstance().getWorkingDirectory).toHaveBeenCalled();
    expect(mockExecutor.process).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("No working directory found");
  });

  test("should handle errors from executor", async () => {
    // Override the mock to throw an error
    (mockExecutor.process as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Test execution error");
    });

    const result = await sessionAwareCommand.execute({});

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe("Test execution error");
  });
});
