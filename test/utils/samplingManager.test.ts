/**
 * Tests for SamplingManager - AI-powered error analysis
 */
import { SamplingManager } from '../../src/utils/samplingManager.js';
import { ErrorAnalysis } from '../../src/utils/types.js';

// Mock the logger
jest.mock('../../src/utils/logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('SamplingManager', () => {
  let samplingManager: SamplingManager;
  let mockMcpServer: any;
  let mockCreateMessage: jest.Mock;

  beforeEach(() => {
    mockCreateMessage = jest.fn();
    
    mockMcpServer = {
      server: {
        createMessage: mockCreateMessage,
      },
    };

    samplingManager = new SamplingManager(mockMcpServer);
  });

  describe('shouldAnalyzeError', () => {
    it('should return true for errors longer than minLength', () => {
      const errorOutput = 'This is a sufficiently long error message that should be analyzed';
      const result = samplingManager.shouldAnalyzeError(errorOutput, 30);
      
      expect(result).toBe(true);
    });

    it('should return false for errors shorter than minLength', () => {
      const errorOutput = 'Short error';
      const result = samplingManager.shouldAnalyzeError(errorOutput, 50);
      
      expect(result).toBe(false);
    });

    it('should return false for empty errors', () => {
      const result = samplingManager.shouldAnalyzeError('', 10);
      
      expect(result).toBe(false);
    });

    it('should return false for "command not found" errors', () => {
      const errorOutput = 'command not found: some-command';
      const result = samplingManager.shouldAnalyzeError(errorOutput, 10);
      
      expect(result).toBe(false);
    });

    it('should return false for "permission denied" errors', () => {
      const errorOutput = 'Permission denied';
      const result = samplingManager.shouldAnalyzeError(errorOutput, 10);
      
      expect(result).toBe(false);
    });

    it('should return false for "no such file or directory" errors', () => {
      const errorOutput = 'no such file or directory';
      const result = samplingManager.shouldAnalyzeError(errorOutput, 10);
      
      expect(result).toBe(false);
    });

    it('should return true for complex ServiceNow SDK errors', () => {
      const errorOutput = 'ServiceNow SDK Error: Failed to build application due to invalid metadata configuration in business-rule.ts';
      const result = samplingManager.shouldAnalyzeError(errorOutput, 50);
      
      expect(result).toBe(true);
    });
  });

  describe('analyzeError', () => {
    it('should successfully analyze an error and return structured result', async () => {
      const mockResponse = {
        content: {
          type: 'text',
          text: `ROOT CAUSE:
The ServiceNow SDK failed to build because of invalid metadata configuration.

SOLUTIONS:
1. Check the business-rule.ts file for syntax errors
2. Validate the metadata schema against ServiceNow requirements
3. Run the clean command before rebuilding

PREVENTION:
1. Use TypeScript strict mode to catch errors early
2. Validate metadata before committing
3. Follow ServiceNow SDK best practices`,
        },
      };

      mockCreateMessage.mockResolvedValue(mockResponse);

      const result = await samplingManager.analyzeError({
        command: 'build_fluent_app',
        args: ['--debug'],
        errorOutput: 'Build failed due to invalid metadata',
        exitCode: 1,
      });

      expect(result).not.toBeNull();
      expect(result?.rootCause).toContain('ServiceNow SDK failed');
      expect(result?.suggestions).toHaveLength(3);
      expect(result?.suggestions[0]).toContain('Check the business-rule.ts');
      expect(result?.preventionTips).toHaveLength(3);
      expect(result?.preventionTips[0]).toContain('TypeScript strict mode');

      expect(mockCreateMessage).toHaveBeenCalledWith(
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

    it('should handle LLM response without proper formatting', async () => {
      const mockResponse = {
        content: {
          type: 'text',
          text: 'The error occurred because the configuration is invalid. Try fixing it.',
        },
      };

      mockCreateMessage.mockResolvedValue(mockResponse);

      const result = await samplingManager.analyzeError({
        command: 'build_fluent_app',
        args: [],
        errorOutput: 'Configuration error',
        exitCode: 1,
      });

      expect(result).not.toBeNull();
      expect(result?.rootCause).toBeDefined();
      expect(result?.suggestions).toHaveLength(1);
      expect(result?.preventionTips).toHaveLength(1);
    });

    it('should return null if createMessage fails', async () => {
      mockCreateMessage.mockRejectedValue(new Error('Sampling not supported'));

      const result = await samplingManager.analyzeError({
        command: 'build_fluent_app',
        args: [],
        errorOutput: 'Some error',
        exitCode: 1,
      });

      expect(result).toBeNull();
    });

    it('should handle bullet points in solutions', async () => {
      const mockResponse = {
        content: {
          text: `ROOT CAUSE:
Network connection failed

SOLUTIONS:
- Check your internet connection
- Verify the instance URL is correct
- Ensure authentication is configured

PREVENTION:
* Always test connection before deployment
* Use valid instance URLs`,
        },
      };

      mockCreateMessage.mockResolvedValue(mockResponse);

      const result = await samplingManager.analyzeError({
        command: 'deploy_fluent_app',
        args: [],
        errorOutput: 'Connection timeout',
        exitCode: 1,
      });

      expect(result?.suggestions).toHaveLength(3);
      expect(result?.suggestions[0]).toBe('Check your internet connection');
      expect(result?.preventionTips).toHaveLength(2);
      expect(result?.preventionTips[0]).toBe('Always test connection before deployment');
    });
  });

  describe('formatAnalysis', () => {
    it('should format error analysis with proper structure', () => {
      const analysis: ErrorAnalysis = {
        rootCause: 'The build failed due to invalid TypeScript configuration',
        suggestions: [
          'Update tsconfig.json with correct settings',
          'Run npm install to ensure dependencies are installed',
          'Clean the output directory before rebuilding',
        ],
        preventionTips: [
          'Use strict type checking',
          'Validate configuration files before committing',
        ],
      };

      const formatted = samplingManager.formatAnalysis(analysis);

      expect(formatted).toContain('🤖 AI Error Analysis:');
      expect(formatted).toContain('📋 Root Cause:');
      expect(formatted).toContain('💡 Suggested Solutions:');
      expect(formatted).toContain('🛡️ Prevention Tips:');
      expect(formatted).toContain('1. Update tsconfig.json');
      expect(formatted).toContain('2. Run npm install');
      expect(formatted).toContain('1. Use strict type checking');
    });

    it('should handle analysis with single suggestion', () => {
      const analysis: ErrorAnalysis = {
        rootCause: 'Missing dependency',
        suggestions: ['Install the missing package'],
        preventionTips: ['Check package.json regularly'],
      };

      const formatted = samplingManager.formatAnalysis(analysis);

      expect(formatted).toContain('1. Install the missing package');
      expect(formatted).not.toContain('2.');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex ServiceNow SDK build error', async () => {
      const mockResponse = {
        content: {
          text: `ROOT CAUSE:
The Fluent SDK encountered a metadata validation error in the business-rule definition. The "when" field contains an invalid value that doesn't match the expected schema.

SOLUTIONS:
1. Review the business-rule.ts file and check the "when" field value
2. Refer to ServiceNow SDK documentation for valid "when" field values
3. Use the sdk_info command with --help flag to see valid options
4. Run "npm run lint" to catch schema violations

PREVENTION:
1. Enable TypeScript strict mode in tsconfig.json
2. Use ServiceNow SDK type definitions for autocompletion
3. Run build locally before pushing to version control
4. Set up pre-commit hooks to validate metadata`,
        },
      };

      mockCreateMessage.mockResolvedValue(mockResponse);

      const result = await samplingManager.analyzeError({
        command: 'build_fluent_app',
        args: ['--debug'],
        errorOutput: 'Metadata validation failed: Invalid value in business-rule "when" field',
        exitCode: 1,
      });

      expect(result).not.toBeNull();
      expect(result?.rootCause).toContain('metadata validation error');
      expect(result?.suggestions).toHaveLength(4);
      expect(result?.preventionTips).toHaveLength(4);
    });

    it('should handle authentication errors', async () => {
      const mockResponse = {
        content: {
          text: `ROOT CAUSE:
Authentication failed because the provided credentials are invalid or the instance URL is incorrect.

SOLUTIONS:
1. Run manage_fluent_auth to reconfigure authentication
2. Verify the instance URL is accessible
3. Check if your ServiceNow account has required permissions

PREVENTION:
1. Store credentials securely
2. Test authentication before deployment`,
        },
      };

      mockCreateMessage.mockResolvedValue(mockResponse);

      const result = await samplingManager.analyzeError({
        command: 'deploy_fluent_app',
        args: ['auth=prod'],
        errorOutput: 'Authentication failed: 401 Unauthorized',
        exitCode: 1,
      });

      expect(result).not.toBeNull();
      expect(result?.rootCause).toContain('Authentication failed');
      expect(result?.suggestions[0]).toContain('manage_fluent_auth');
    });
  });
});
