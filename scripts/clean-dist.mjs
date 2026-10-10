#!/usr/bin/env node
/**
 * Removes build output before a build, so dist/ never keeps files from an
 * earlier build. npm pack ships whatever is in dist/, so stale declarations or
 * modules from removed sources would otherwise be published.
 */
import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
rmSync(distDir, { recursive: true, force: true });
