import { CommandResult } from "../../src/utils/types.js";
import { CLIExecutor } from "../../src/tools/cliCommandTools.js";
import { AuthCommand } from "../../src/tools/commands/authCommand.js";

// Mock the session manager
jest.mock("../../src/utils/sessionManager.js", () => ({
  SessionManager: {
    getInstance: jest.fn().mockReturnValue({
      getWorkingDirectory: jest.fn().mockReturnValue(undefined),
    }),
  },
}));

describe("AuthCommand", () => {
  let authCommand: AuthCommand;
  let mockExecutor: CLIExecutor;

  beforeEach(() => {
    // Create a mock executor
    mockExecutor = {
      execute: jest.fn().mockImplementation((command, args, useMcpCwd) => {
        // Default mock implementation for successful execution
        return Promise.resolve({
          success: true,
          output: "Mock auth command executed successfully",
          exitCode: 0,
        } as CommandResult);
      }),
    } as unknown as CLIExecutor;

    authCommand = new AuthCommand(mockExecutor);
  });

  test("should create an auth command with correct properties", () => {
    expect(authCommand.name).toBe("manage_fluent_auth");
    expect(authCommand.description).toBe(
      "Manage Fluent (ServiceNow SDK) authentication profiles"
    );
    expect(authCommand.arguments.length).toBeGreaterThan(0);
  });

  test("should execute list authentication profiles", async () => {
    const result = await authCommand.execute({ list: true });

    expect(mockExecutor.execute).toHaveBeenCalledWith(
      "npx",
      ["now-sdk", "auth", "--list"],
      false,
      process.cwd()
    );
    expect(result.success).toBe(true);
  });

  test("should execute add authentication profile", async () => {
    const result = await authCommand.execute({
      add: true,
      instanceUrl: "https://example.service-now.com",
      alias: "testuser",
      type: "oauth",
    });

    expect(mockExecutor.execute).toHaveBeenCalledWith(
      "npx",
      [
        "now-sdk",
        "auth",
        "--add",
        "https://example.service-now.com",
        "--type",
        "oauth",
        "--alias",
        "testuser",
      ],
      false,
      process.cwd()
    );
    expect(result.success).toBe(true);
  });

  test("should execute delete authentication profile", async () => {
    const result = await authCommand.execute({ delete: "testuser" });

    expect(mockExecutor.execute).toHaveBeenCalledWith(
      "npx",
      ["now-sdk", "auth", "--delete", "testuser"],
      false,
      process.cwd()
    );
    expect(result.success).toBe(true);
  });

  test("should execute use authentication profile", async () => {
    const result = await authCommand.execute({ use: "testuser" });

    expect(mockExecutor.execute).toHaveBeenCalledWith(
      "npx",
      ["now-sdk", "auth", "--use", "testuser"],
      false,
      process.cwd()
    );
    expect(result.success).toBe(true);
  });

  test("should fail when add command is missing instanceUrl", async () => {
    const result = await authCommand.execute({ add: true });

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("must provide --instanceUrl");
    expect(mockExecutor.execute).not.toHaveBeenCalled();
  });
});
