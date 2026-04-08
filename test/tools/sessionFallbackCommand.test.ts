import { CommandProcessor, CommandResult } from "../../src/utils/types.js";
import { SessionFallbackCommand } from "../../src/tools/commands/sessionFallbackCommand.js";
import { SessionManager } from "../../src/utils/sessionManager.js";

jest.mock("../../src/utils/sessionManager.js", () => require('../mocks/index.js').createSessionManagerMock());
jest.mock("../../src/config.js", () => require('../mocks/index.js').createConfigMock());
jest.mock("../../src/utils/logger.js", () => require('../mocks/index.js').createLoggerMock());

// Create a test implementation of SessionFallbackCommand
class TestFallbackCommand extends SessionFallbackCommand {
  name = "test_command";
  description = "Test command";
  arguments = [];

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    return this.executeWithFallback("test", ["arg1", "arg2"]);
  }
}

describe("SessionFallbackCommand", () => {
  let command: TestFallbackCommand;
  let mockExecutor: CommandProcessor;

  beforeEach(() => {
    jest.clearAllMocks();

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
      }),
    } as CommandProcessor;

    command = new TestFallbackCommand(mockExecutor);
  });

  test("should use working directory from session when available", async () => {
    // Setup session to return a working directory
    (SessionManager.getInstance().getWorkingDirectory as jest.Mock).mockReturnValue("/session-working-dir");

    await command.execute({});

    expect(SessionManager.getInstance().getWorkingDirectory).toHaveBeenCalled();
    expect(mockExecutor.process).toHaveBeenCalledWith(
      "test",
      ["arg1", "arg2"],
      false, // useMcpCwd
      "/session-working-dir", // working directory from session
      undefined // stdinInput
    );
  });

  test("should fall back to MCP root when no session working directory", async () => {
    // Setup session to return no working directory
    (SessionManager.getInstance().getWorkingDirectory as jest.Mock).mockReturnValue(undefined);

    await command.execute({});

    expect(SessionManager.getInstance().getWorkingDirectory).toHaveBeenCalled();
    // The config module is already mocked via Jest setup
    expect(mockExecutor.process).toHaveBeenCalledWith(
      "test",
      ["arg1", "arg2"],
      true, // use MCP root as working directory
      undefined, // customWorkingDir
      undefined // stdinInput
    );
  });
});
