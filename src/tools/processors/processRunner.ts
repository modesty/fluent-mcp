import { spawn, SpawnOptionsWithoutStdio } from 'node:child_process';
import { ProcessResult, ProcessRunner } from '../../utils/types.js';
import logger from '../../utils/logger.js';

/** Default timeout for child process execution in milliseconds */
const DEFAULT_PROCESS_TIMEOUT_MS = 12000;

/** Delay before checking for prompts after stdout data (allows buffering) */
const STDIN_PROMPT_CHECK_DELAY_MS = 50;

/** Delay before closing stdin after all input lines written */
const STDIN_CLOSE_DELAY_MS = 200;

/**
 * Spawns child processes to execute CLI commands
 * Handles timeout, interactive stdin prompt detection, and secure credential handling
 */
export class NodeProcessRunner implements ProcessRunner {
  async run(
    command: string,
    args: string[] = [],
    cwd?: string,
    stdinInput?: string,
    timeoutMs?: number
  ): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
      const effectiveTimeout = timeoutMs ?? DEFAULT_PROCESS_TIMEOUT_MS;
      const env = { ...process.env }; // ensure full environment inheritance
      // Create AbortController for timeout handling
      const controller = new AbortController();
      const { signal } = controller;
      // Set timeout to automatically abort if process hangs
      const timeoutId = setTimeout(() => {
        controller.abort();
        logger.warn(`Command execution timed out after ${effectiveTimeout}ms: ${command} ${args.join(' ')}`);
      }, effectiveTimeout);

      const options: SpawnOptionsWithoutStdio = {
        stdio: 'pipe',
        shell: true,
        cwd, env, signal
      };
      logger.info(`Spawning child process: ${command} ${args.join(' ')}`, { cwd });

      let child;
      try {
        child = spawn(command, args, options);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
        return;
      }

      // Log if stdin input is provided (actual writing happens in response to prompts)
      if (stdinInput && child.stdin) {
        logger.debug('Stdin input provided, will write in response to detected prompts');
      }

      let stdout = '';
      let stderr = '';

      // For interactive input, track state and detect prompts
      const stdinState = {
        lines: stdinInput?.split('\n').filter(line => line.length > 0) || [],
        lineIndex: 0,
        pendingStdout: '',
        inputComplete: false
      };

      // Function to check for prompts and write next input line
      const writeNextLineIfPrompted = () => {
        if (stdinState.inputComplete || stdinState.lineIndex >= stdinState.lines.length) {
          return;
        }
        if (!child.stdin || child.stdin.destroyed) {
          return;
        }

        // Detect inquirer-style prompts (start with "?") or other input requests
        // Match: "? Question text" - inquirer prompts start with question mark
        const hasPrompt = /\?\s+[^\n]+$/.test(stdinState.pendingStdout);

        if (hasPrompt) {
          const line = stdinState.lines[stdinState.lineIndex];
          logger.debug(`Prompt detected, writing stdin line ${stdinState.lineIndex + 1}/${stdinState.lines.length}`);
          child.stdin.write(line + '\n');
          // Security: Clear the credential line from memory after writing
          stdinState.lines[stdinState.lineIndex] = '';
          stdinState.lineIndex++;
          stdinState.pendingStdout = ''; // Reset to wait for next prompt

          // If all lines written, close stdin after a small delay
          if (stdinState.lineIndex >= stdinState.lines.length) {
            stdinState.inputComplete = true;
            // Security: Clear all stdin lines from memory
            stdinState.lines.length = 0;
            setTimeout(() => {
              if (child.stdin && !child.stdin.destroyed) {
                logger.debug('Closing stdin after writing all lines');
                child.stdin.end();
              }
            }, STDIN_CLOSE_DELAY_MS);
          }
        }
      };

      child.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        stdout += text;
        // Log real-time output for debugging
        logger.info(`[STDOUT] ${text.trim()}`);

        // Accumulate stdout for prompt detection if we have stdin to write
        if (stdinInput && !stdinState.inputComplete) {
          stdinState.pendingStdout += text;
          // Check for prompts after a tiny delay to allow buffering
          setTimeout(writeNextLineIfPrompted, STDIN_PROMPT_CHECK_DELAY_MS);
        }
      });

      child.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        stderr += text;
        // Log real-time errors for debugging
        logger.info(`[STDERR] ${text.trim()}`);
      });

      child.on('close', (code: number | null) => {
        clearTimeout(timeoutId);
        logger.info(`Process exited with code ${code}: ${command} ${args.join(' ')}`);
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0,
        });
      });

      child.on('error', (error: Error) => {
        clearTimeout(timeoutId);
        logger.error(`Process error: ${error.message}`);
        reject(error);
      });

      // Handle aborted processes
      signal.addEventListener('abort', () => {
        if (child && !child.killed) {
          // Force kill the process that's hanging
          child.kill('SIGKILL');
          reject(new Error(`Process killed after timeout (${effectiveTimeout}ms): ${command} ${args.join(' ')}`));
        }
      });

    });
  }
}
