/**
 * Utility to ensure that tests that use the logger and LoggingManager don't fail when 
 * the notification function is missing in the MCP server mock
 */
export function patchLoggerForTests(): void {
  try {
    // Mock the notification method in the MCP server
    const mcpMock = jest.requireMock('@modelcontextprotocol/sdk/server/mcp.js');
    
    // Ensure McpServer mock has proper shape
    if (mcpMock?.McpServer?.mock) {
      // Get all mock results (there might be multiple instances)
      const mockResults = mcpMock.McpServer.mock.results;
      
      // Apply patch to all instances
      mockResults.forEach((result: {value?: any}) => {
        // Use optional chaining for safer property access
        if (result?.value?.server) {
          // Ensure notification function exists with nullish coalescing
          result.value.server.notification ??= jest.fn();
        }
      });
    }

    // Mock LoggingManager if it's being used in the test
    try {
      const LoggingManagerMock = jest.requireMock('../../src/utils/loggingManager.js');
      // Use optional chaining for safer property access
      if (LoggingManagerMock?.loggingManager) {
        // Make sure any methods that need the MCP server are patched
        const mockLoggingManager = LoggingManagerMock.loggingManager;
        // Use nullish coalescing for default assignment
        mockLoggingManager.configure ??= jest.fn();
      }
    } catch (err) {
      // LoggingManager might not be used in all tests, so silently ignore
    }
  } catch (error) {
    console.warn('Failed to patch logger for tests:', error);
  }
}
