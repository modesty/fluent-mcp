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
    expect(authCommand.name).toBe("manage_fluent_auth");
    expect(authCommand.description).toContain(
      "Manage Fluent (ServiceNow SDK) authentication"
    );
    const argNames = authCommand.arguments.map(a => a.name);
    expect(argNames).toEqual(
      expect.arrayContaining([
        "add",
        "type",
        "alias",
        "list",
        "delete",
        "use",
        "debug"
      ])
    );
    expect(argNames).not.toContain("instanceUrl");
  });

  test("should execute auth command with --add value and optional flags", async () => {
    const args = {
      add: "foo", // instance name or URL
      type: "basic",
      alias: "bar"
    };

    const result = await authCommand.execute(args);

    expect(mockCmdWriter.process).toHaveBeenCalledWith(
      "npx",
      expect.arrayContaining([
        "now-sdk",
        "auth",
        "--add",
        "foo",
        "--type",
        "basic",
        "--alias",
        "bar"
      ]),
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
  
  test("should pass through --list, --help and --version", async () => {
    const args = { list: true, help: true, version: true };
    await authCommand.execute(args);
    expect(mockCmdWriter.process).toHaveBeenCalledWith(
      "npx",
      expect.arrayContaining(["now-sdk", "auth", "--list", "--help", "--version"]),
      false,
      "/test-working-dir"
    );
  });

  test("should error when multiple primary flags provided", async () => {
    const result = await authCommand.execute({ list: true, use: "bar" });
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toContain("Provide only one of");
  });

  test("should validate --type choices", async () => {
    const result = await authCommand.execute({ add: "foo", type: "invalid" });
    expect(result.success).toBe(false);
    expect((result.error as Error).message).toContain("Invalid --type");
  });
});
