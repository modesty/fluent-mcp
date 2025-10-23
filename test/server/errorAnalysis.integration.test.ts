/**
 * Integration tests for Error Analysis feature
 * Tests component integration without mocking the full MCP handler system
 */
import { SamplingManager } from '../../src/utils/samplingManager.js';
import { ErrorAnalysis, CommandResult } from '../../src/utils/types.js';

// Mock config with sampling enabled
jest.mock('../../src/config.js', () => ({
  __esModule: true,
  getConfig: jest.fn().mockReturnValue({
    name: 'test-mcp-server',
    version: '1.0.0',
    description: 'Test MCP Server',
    logLevel: 'info',
    resourcePaths: {
      spec: '/mock/path/to/spec',
      snippet: '/mock/path/to/snippet',
      instruct: '/mock/path/to/instruct',
    },
    servicenowSdk: {
      cliPath: 'snc',
      commandTimeoutMs: 30000,
    },
    sampling: {
      enableErrorAnalysis: true,
      minErrorLength: 50,
    },
  }),
  getProjectRootPath: jest.fn().mockReturnValue('/mock/project/root'),
}));

// Mock logger
jest.mock('../../src/utils/logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Error Analysis Integration', () => {
  describe('Configuration Integration', () => {
    it('should load sampling configuration with default values', () => {
      const { getConfig } = require('../../src/config.js');
      const config = getConfig();
      
      expect(config.sampling).toBeDefined();
      expect(config.sampling.enableErrorAnalysis).toBe(true);
      expect(config.sampling.minErrorLength).toBe(50);
    });

    it('should support disabling error analysis via config', () => {
      const { getConfig } = require('../../src/config.js');
      
      // Temporarily override mock
      getConfig.mockReturnValueOnce({
        name: 'test-mcp-server',
        version: '1.0.0',
        description: 'Test MCP Server',
        logLevel: 'info',
        resourcePaths: {
          spec: '/mock/path/to/spec',
          snippet: '/mock/path/to/snippet',
          instruct: '/mock/path/to/instruct',
        },
        servicenowSdk: {
          cliPath: 'snc',
          commandTimeoutMs: 30000,
        },
        sampling: {
          enableErrorAnalysis: false,
          minErrorLength: 50,
        },
      });
      
      const config = getConfig();
      expect(config.sampling.enableErrorAnalysis).toBe(false);
    });
  });

  describe('SamplingManager Integration with CommandResult', () => {
    let samplingManager: SamplingManager;
    let mockMcpServer: any;

    beforeEach(() => {
      mockMcpServer = {
        server: {
          createMessage: jest.fn(),
        },
      };
      samplingManager = new SamplingManager(mockMcpServer);
    });

    it('should enhance CommandResult with error analysis', async () => {
      // Mock successful error analysis
      mockMcpServer.server.createMessage.mockResolvedValue({
        content: {
          text: `ROOT CAUSE:
The build failed due to TypeScript compilation errors.

SOLUTIONS:
1. Check tsconfig.json for correct settings
2. Fix type errors in the code
3. Run npm install to update dependencies

PREVENTION:
1. Use strict type checking
2. Run build before committing`,
        },
      });

      const initialResult: CommandResult = {
        success: false,
        exitCode: 1,
        output: '',
        error: new Error('TypeScript compilation failed with 3 errors in business-rule.ts'),
      };

      // Analyze the error
      const analysis = await samplingManager.analyzeError({
        command: 'build_fluent_app',
        args: ['--debug'],
        errorOutput: initialResult.error!.message,
        exitCode: initialResult.exitCode,
      });

      // Enhance result with analysis
      const enhancedResult: CommandResult = {
        ...initialResult,
        errorAnalysis: analysis!,
      };

      expect(enhancedResult.errorAnalysis).toBeDefined();
      expect(enhancedResult.errorAnalysis?.rootCause).toContain('TypeScript compilation');
      expect(enhancedResult.errorAnalysis?.suggestions).toHaveLength(3);
      expect(enhancedResult.errorAnalysis?.preventionTips).toHaveLength(2);
    });

    it('should handle CommandResult without error analysis when disabled', () => {
      const result: CommandResult = {
        success: false,
        exitCode: 1,
        output: '',
        error: new Error('Some error'),
      };

      // Result without analysis should still be valid
      expect(result.errorAnalysis).toBeUndefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Error Classification Logic', () => {
    let samplingManager: SamplingManager;
    let mockMcpServer: any;

    beforeEach(() => {
      mockMcpServer = {
        server: {
          createMessage: jest.fn(),
        },
      };
      samplingManager = new SamplingManager(mockMcpServer);
    });

    it('should classify ServiceNow SDK build errors as analyzable', () => {
      const { getConfig } = require('../../src/config.js');
      const error = 'ServiceNow SDK build failed: Invalid metadata configuration in business-rule.ts';
      const config = getConfig();
      
      const shouldAnalyze = samplingManager.shouldAnalyzeError(
        error,
        config.sampling.minErrorLength
      );

      expect(shouldAnalyze).toBe(true);
    });

    it('should not classify short errors as analyzable', () => {
      const { getConfig } = require('../../src/config.js');
      const error = 'Build failed';
      const config = getConfig();
      
      const shouldAnalyze = samplingManager.shouldAnalyzeError(
        error,
        config.sampling.minErrorLength
      );

      expect(shouldAnalyze).toBe(false);
    });

    it('should not classify trivial errors as analyzable', () => {
      const { getConfig } = require('../../src/config.js');
      const errors = [
        'command not found: some-cmd',
        'Permission denied',
        'no such file or directory',
      ];
      const config = getConfig();

      errors.forEach(error => {
        const shouldAnalyze = samplingManager.shouldAnalyzeError(
          error,
          config.sampling.minErrorLength
        );
        expect(shouldAnalyze).toBe(false);
      });
    });
  });

  describe('Error Analysis Formatting', () => {
    let samplingManager: SamplingManager;
    let mockMcpServer: any;

    beforeEach(() => {
      mockMcpServer = {
        server: {
          createMessage: jest.fn(),
        },
      };
      samplingManager = new SamplingManager(mockMcpServer);
    });

    it('should format error analysis with proper structure and emojis', () => {
      const analysis: ErrorAnalysis = {
        rootCause: 'Build failed due to invalid configuration',
        suggestions: [
          'Check tsconfig.json',
          'Verify package.json dependencies',
          'Run clean before build',
        ],
        preventionTips: [
          'Use strict mode',
          'Validate before committing',
        ],
      };

      const formatted = samplingManager.formatAnalysis(analysis);

      expect(formatted).toContain('🤖 AI Error Analysis:');
      expect(formatted).toContain('📋 Root Cause:');
      expect(formatted).toContain('💡 Suggested Solutions:');
      expect(formatted).toContain('🛡️ Prevention Tips:');
      expect(formatted).toContain('1. Check tsconfig.json');
      expect(formatted).toContain('2. Verify package.json dependencies');
      expect(formatted).toContain('3. Run clean before build');
      expect(formatted).toContain('1. Use strict mode');
      expect(formatted).toContain('2. Validate before committing');
    });

    it('should format error analysis for integration with CommandResult output', () => {
      const analysis: ErrorAnalysis = {
        rootCause: 'Authentication failed',
        suggestions: ['Check credentials', 'Verify instance URL'],
        preventionTips: ['Store credentials securely'],
      };

      const baseErrorOutput = '❌ Error:\nAuthentication failed\n(exit code: 1)';
      const formatted = samplingManager.formatAnalysis(analysis);
      const fullOutput = baseErrorOutput + '\n' + formatted;

      expect(fullOutput).toContain('❌ Error:');
      expect(fullOutput).toContain('🤖 AI Error Analysis:');
      expect(fullOutput).toContain('Authentication failed'); // Appears in both sections
    });
  });

  describe('End-to-End Error Analysis Flow', () => {
    let samplingManager: SamplingManager;
    let mockMcpServer: any;

    beforeEach(() => {
      mockMcpServer = {
        server: {
          createMessage: jest.fn(),
        },
      };
      samplingManager = new SamplingManager(mockMcpServer);
    });

    it('should complete full error analysis workflow', async () => {
      const { getConfig } = require('../../src/config.js');
      const config = getConfig();
      const errorMessage = 'ServiceNow SDK: Metadata validation failed in business-rule.ts - invalid "when" field value';

      // Step 1: Check if error should be analyzed
      const shouldAnalyze = samplingManager.shouldAnalyzeError(
        errorMessage,
        config.sampling.minErrorLength
      );
      expect(shouldAnalyze).toBe(true);

      // Step 2: Mock LLM response
      mockMcpServer.server.createMessage.mockResolvedValue({
        content: {
          text: `ROOT CAUSE:
The business rule has an invalid value in the "when" field that doesn't match ServiceNow's schema.

SOLUTIONS:
1. Review the business-rule.ts file for the "when" field
2. Check ServiceNow SDK documentation for valid values
3. Use TypeScript types for validation

PREVENTION:
1. Enable strict TypeScript mode
2. Use SDK type definitions
3. Test locally before deployment`,
        },
      });

      // Step 3: Analyze error
      const analysis = await samplingManager.analyzeError({
        command: 'build_fluent_app',
        args: ['--debug'],
        errorOutput: errorMessage,
        exitCode: 1,
      });

      expect(analysis).not.toBeNull();
      expect(analysis?.rootCause).toContain('invalid value');
      expect(analysis?.suggestions).toHaveLength(3);
      expect(analysis?.preventionTips).toHaveLength(3);

      // Step 4: Format for output
      const formatted = samplingManager.formatAnalysis(analysis!);
      expect(formatted).toContain('🤖 AI Error Analysis:');

      // Step 5: Verify createMessage was called with correct parameters
      expect(mockMcpServer.server.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.objectContaining({
                type: 'text',
                text: expect.stringContaining('build_fluent_app'),
              }),
            }),
          ]),
          maxTokens: 800,
          modelPreferences: {
            intelligencePriority: 0.8,
            speedPriority: 0.2,
          },
        })
      );
    });

    it('should gracefully handle sampling failure in workflow', async () => {
      const { getConfig } = require('../../src/config.js');
      const config = getConfig();
      const errorMessage = 'ServiceNow SDK: Build failed with complex error in business-rule.ts due to metadata validation issues';

      // Step 1: Error should be analyzed
      const shouldAnalyze = samplingManager.shouldAnalyzeError(
        errorMessage,
        config.sampling.minErrorLength
      );
      expect(shouldAnalyze).toBe(true);

      // Step 2: Mock sampling failure
      mockMcpServer.server.createMessage.mockRejectedValue(
        new Error('Sampling not supported by client')
      );

      // Step 3: Analyze error - should return null
      const analysis = await samplingManager.analyzeError({
        command: 'build_fluent_app',
        args: [],
        errorOutput: errorMessage,
        exitCode: 1,
      });

      expect(analysis).toBeNull();

      // Step 4: CommandResult should still be valid without analysis
      const result: CommandResult = {
        success: false,
        exitCode: 1,
        output: '',
        error: new Error(errorMessage),
        errorAnalysis: analysis || undefined,
      };

      expect(result.errorAnalysis).toBeUndefined();
      expect(result.error).toBeDefined();
    });
  });
});
