// rollup.config.mjs - Using .mjs extension to force ES modules mode
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';

const external = [
  'process',
  'console',
  'fs',
  'util',
  'fs/promises',
  'events',
  'path',
  'url',
  'buffer',
  'stream',
  '@modelcontextprotocol/sdk',
  '@servicenow/sdk',
  'zod',
  'zod-to-json-schema'
];

export default [
  {
    input: './src/index.ts',
    external,
    output: [
      {
        file: './dist/index.js',
        format: 'es',
        sourcemap: true
      },
    ],
    treeshake: false,
    plugins: [
      typescript({ tsconfig: './tsconfig.json' }),
      json(),
      nodeResolve({
        preferBuiltins: true,
        exportConditions: ['node'],
      }),
      commonjs(),
      terser({
        format: {
          comments: false
        },
      }),
    ]
  }
];
