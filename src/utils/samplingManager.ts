/**
 * SamplingManager - Handles MCP Sampling operations for AI-powered features
 * 
 * This utility provides error analysis using the MCP Sampling capability,
 * which allows the server to request LLM assistance from the client.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ErrorAnalysis } from './types.js';
import logger from './logger.js';

/**
 * Parameters for error analysis
 */
export interface ErrorAnalysisParams {
  /** Command that failed */
  command: string;
  /** Command arguments */
  args: string[];
  /** Error output from the command */
  errorOutput: string;
  /** Exit code of the failed command */
  exitCode: number;
}

/**
 * SamplingManager handles AI-powered analysis using MCP Sampling
 */
export class SamplingManager {
  constructor(private mcpServer: McpServer) {}

  /**
   * Check if error should be analyzed based on its characteristics
   * @param errorOutput The error message to check
   * @param minLength Minimum error length to trigger analysis
   * @returns True if error should be analyzed
   */
  shouldAnalyzeError(errorOutput: string, minLength: number = 50): boolean {
    if (!errorOutput || errorOutput.trim().length < minLength) {
      return false;
    }

    // Skip analysis for common trivial errors
    const trivialPatterns = [
      /^command not found/i,
      /^permission denied/i,
      /^no such file or directory$/i,
    ];

    return !trivialPatterns.some(pattern => pattern.test(errorOutput.trim()));
  }

  /**
   * Analyze command error and provide AI-powered suggestions
   * Uses MCP Sampling to request LLM analysis from the client
   * 
   * @param params Error analysis parameters
   * @returns Promise with error analysis result
   */
  async analyzeError(params: ErrorAnalysisParams): Promise<ErrorAnalysis | null> {
    try {
      logger.info('Requesting error analysis via MCP Sampling', {
        command: params.command,
        exitCode: params.exitCode,
      });

      // Construct the analysis prompt
      const prompt = this.buildErrorAnalysisPrompt(params);

      // Request LLM analysis via MCP Sampling
      const result = await this.mcpServer.server.createMessage({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt,
            },
          },
        ],
        maxTokens: 800,
        modelPreferences: {
          intelligencePriority: 0.8, // Prioritize intelligence for analysis
          speedPriority: 0.2,
        },
      });

      // Parse the LLM response
      const analysis = this.parseAnalysisResponse(result.content);
      
      logger.info('Error analysis completed successfully');
      return analysis;
    } catch (error) {
      // If Sampling fails, log but don't break the flow
      logger.warn('Error analysis failed, continuing without it', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Build the error analysis prompt for the LLM
   * @param params Error analysis parameters
   * @returns Formatted prompt string
   */
  private buildErrorAnalysisPrompt(params: ErrorAnalysisParams): string {
    return `You are an expert in ServiceNow SDK and Fluent development. Analyze this command error and provide structured guidance.

Command: ${params.command} ${params.args.join(' ')}
Exit Code: ${params.exitCode}

Error Output:
${params.errorOutput}

Provide your analysis in the following format:

ROOT CAUSE:
[One clear paragraph explaining what went wrong]

SOLUTIONS:
1. [First specific solution step]
2. [Second specific solution step]
3. [Additional steps as needed]

PREVENTION:
1. [First prevention tip]
2. [Second prevention tip]
3. [Additional prevention tips]

Keep each section concise and actionable. Focus on ServiceNow SDK and Fluent-specific issues.`;
  }

  /**
   * Parse the LLM response into structured ErrorAnalysis
   * @param content Response content from LLM
   * @returns Parsed error analysis
   */
  private parseAnalysisResponse(content: any): ErrorAnalysis {
    // Extract text from content
    const text = typeof content === 'string' ? content : content.text || '';

    // Parse sections using regex
    const rootCauseMatch = text.match(/ROOT CAUSE:\s*([\s\S]*?)(?=SOLUTIONS:|$)/i);
    const solutionsMatch = text.match(/SOLUTIONS:\s*([\s\S]*?)(?=PREVENTION:|$)/i);
    const preventionMatch = text.match(/PREVENTION:\s*([\s\S]*?)$/i);

    // Extract root cause
    const rootCause = rootCauseMatch
      ? rootCauseMatch[1].trim()
      : 'Unable to determine root cause';

    // Extract solutions (numbered list)
    const solutionsText = solutionsMatch ? solutionsMatch[1].trim() : '';
    const suggestions = this.extractListItems(solutionsText);

    // Extract prevention tips (numbered list)
    const preventionText = preventionMatch ? preventionMatch[1].trim() : '';
    const preventionTips = this.extractListItems(preventionText);

    return {
      rootCause,
      suggestions: suggestions.length > 0 ? suggestions : ['No specific solutions provided'],
      preventionTips: preventionTips.length > 0 ? preventionTips : ['Review ServiceNow SDK documentation'],
    };
  }

  /**
   * Extract numbered list items from text
   * @param text Text containing numbered list
   * @returns Array of list items
   */
  private extractListItems(text: string): string[] {
    const items: string[] = [];
    
    // Match numbered items (1., 2., etc.) or bullet points
    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Match patterns like "1. ", "2. ", "- ", "* "
      const match = trimmed.match(/^(?:\d+\.|[-*])\s+(.+)$/);
      if (match && match[1]) {
        items.push(match[1].trim());
      }
    }

    // If no numbered items found, try to split by sentence
    if (items.length === 0 && text.trim().length > 0) {
      const sentences = text
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 10);
      
      if (sentences.length > 0) {
        return sentences.slice(0, 5); // Limit to 5 items
      }
    }

    return items;
  }

  /**
   * Format error analysis for display
   * @param analysis Error analysis result
   * @returns Formatted string for display
   */
  formatAnalysis(analysis: ErrorAnalysis): string {
    let output = '\n🤖 AI Error Analysis:\n\n';
    
    output += '📋 Root Cause:\n';
    output += `${analysis.rootCause}\n\n`;
    
    output += '💡 Suggested Solutions:\n';
    analysis.suggestions.forEach((suggestion, index) => {
      output += `${index + 1}. ${suggestion}\n`;
    });
    
    output += '\n🛡️ Prevention Tips:\n';
    analysis.preventionTips.forEach((tip, index) => {
      output += `${index + 1}. ${tip}\n`;
    });
    
    return output;
  }
}
