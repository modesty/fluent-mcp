/**
 * Bounding command output to protect server memory and the model's token budget.
 *
 * Output over budget keeps its head and tail with an elision marker in between.
 * The process runner bounds every stream while it streams; the commands that
 * parse a JSON envelope (`query`, `cicd`, `exec`) capture stdout with the much
 * larger `ENVELOPE_CAPTURE_CHARS` instead, because a cut envelope cannot be
 * parsed, and bound the result to the normal size only after reading it.
 */

/** Default cap on the output a tool returns, per stream (characters). */
export const DEFAULT_MAX_OUTPUT_CHARS = 60_000;

/**
 * Stdout capture cap for commands that parse a JSON envelope (characters).
 * A query of 100 full records easily passes the default cap, and `exec` allows
 * 50,001 output lines.
 */
export const ENVELOPE_CAPTURE_CHARS = 8_000_000;

/** Fraction of the output budget retained from the head (the rest is the tail). */
const HEAD_BUDGET_RATIO = 0.6;

/**
 * Accumulates streamed text while retaining at most `maxChars` characters — the
 * head (start of output) plus a sliding tail (most recent output). Memory stays
 * bounded regardless of how much a child process emits; when output exceeds the
 * budget the middle is dropped and reported via an elision marker.
 * `.toString()` reconstructs head + marker + tail.
 */
export class BoundedBuffer {
  private readonly headMax: number;
  private readonly tailMax: number;
  private head = '';
  private tail = '';
  private total = 0;

  constructor(maxChars: number = DEFAULT_MAX_OUTPUT_CHARS) {
    this.headMax = Math.max(1, Math.floor(maxChars * HEAD_BUDGET_RATIO));
    this.tailMax = Math.max(0, maxChars - this.headMax);
  }

  append(text: string): void {
    if (!text) return;
    this.total += text.length;

    // Fill the head first; overflow (and everything after) feeds the sliding tail.
    if (this.head.length < this.headMax) {
      const room = this.headMax - this.head.length;
      this.head += text.slice(0, room);
      const overflow = text.slice(room);
      if (overflow) this.pushTail(overflow);
    } else {
      this.pushTail(text);
    }
  }

  private pushTail(text: string): void {
    // Keep only the last `tailMax` chars. The transient `tail + text` is bounded
    // by tailMax plus one stream chunk (Node caps 'data' events well below this).
    this.tail = this.tailMax > 0 ? (this.tail + text).slice(-this.tailMax) : '';
  }

  /** True when the middle of the output was dropped. */
  get truncated(): boolean {
    return this.total > this.head.length + this.tail.length;
  }

  toString(): string {
    if (!this.truncated) return this.head + this.tail;
    const elided = this.total - this.head.length - this.tail.length;
    return `${this.head}\n\n... [${elided} characters truncated] ...\n\n${this.tail}`;
  }
}

/** Bound already-captured text exactly as the runner bounds a stream. */
export function boundText(text: string, maxChars: number = DEFAULT_MAX_OUTPUT_CHARS): string {
  if (text.length <= maxChars) return text;
  const buffer = new BoundedBuffer(maxChars);
  buffer.append(text);
  return buffer.toString();
}
