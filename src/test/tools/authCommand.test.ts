import { CommandResult } from "../../utils/types";
import { CLIExecutor } from "../../tools/cliCommandTools";
import { AuthCommand } from "../../tools/commands/authCommand";
import { SessionManager } from "../../utils/sessionManager";

// Mock the session manager
jest.mock("../../utils/sessionManager", () => ({
  SessionManager: {
    getInstance: jest.fn().mockReturnValue({
      getWorkingDirectory: jest.fn().mockReturnValue(undefined),
    }),
  },
}));

// Mock the config module
jest.mock("../../config", () => ({
  getProjectRootPath: jest.fn(() => process.cwd()),
  getConfig: jest.fn(() => ({
    name: "mocked-name",
    version: "mocked-version",
    description: "mocked-description",
    logLevel: "info",
    resourcePaths: {
      spec: "/mocked/spec",
      snippet: "/mocked/snippet",
      instruct: "/mocked/instruct",
    },
    servicenowSdk: {
      cliPath: ".",
      commandTimeoutMs: 30000,
    },
  })),
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
