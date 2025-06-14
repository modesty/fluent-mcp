import { CommandResult } from "../../utils/types";
import { CLIExecutor } from "../../tools/cliCommandTools";
import { SessionFallbackCommand } from "../../tools/commands/sessionFallbackCommand";
import { SessionManager } from "../../utils/sessionManager";
import { getProjectRootPath } from "../../config";

// Mock the session manager
jest.mock("../../utils/sessionManager", () => ({
  SessionManager: {
    getInstance: jest.fn().mockReturnValue({
      getWorkingDirectory: jest.fn(),
    }),
  },
}));

// Mock the config module
jest.mock("../../config", () => ({
  getProjectRootPath: jest.fn().mockReturnValue("/mock-project-root"),
  getConfig: jest.fn().mockReturnValue({
    logLevel: "info",
    name: "mocked-name",
    version: "0.0.1",
  }),
}));

// Mock the logger
jest.mock("../../utils/logger", () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }
}));

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
  let mockExecutor: CLIExecutor;

  beforeEach(() => {
    jest.clearAllMocks();

    mockExecutor = {
      execute: jest.fn().mockImplementation(() => {
        return Promise.resolve({
          success: true,
          output: "Mock command executed successfully",
          exitCode: 0,
        } as CommandResult);
      }),
    } as unknown as CLIExecutor;

    command = new TestFallbackCommand(mockExecutor);
  });

  test("should use working directory from session when available", async () => {
    // Setup session to return a working directory
    (SessionManager.getInstance().getWorkingDirectory as jest.Mock).mockReturnValue("/session-working-dir");

    await command.execute({});

    expect(SessionManager.getInstance().getWorkingDirectory).toHaveBeenCalled();
    expect(mockExecutor.execute).toHaveBeenCalledWith(
      "test", 
      ["arg1", "arg2"], 
      false, // useMcpCwd
      "/session-working-dir" // working directory from session
    );
  });

  test("should fall back to project root when no session working directory", async () => {
    // Setup session to return no working directory
    (SessionManager.getInstance().getWorkingDirectory as jest.Mock).mockReturnValue(undefined);

    await command.execute({});

    expect(SessionManager.getInstance().getWorkingDirectory).toHaveBeenCalled();
    expect(getProjectRootPath).toHaveBeenCalled();
    expect(mockExecutor.execute).toHaveBeenCalledWith(
      "test", 
      ["arg1", "arg2"], 
      false, // useMcpCwd
      "/mock-project-root" // fallback to project root
    );
  });
});
