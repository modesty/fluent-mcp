// rollup.config.mjs - Using .mjs extension to force ES modules mode
import json from '@rollup/plugin-json';
// import eslint from '@rollup/plugin-eslint';
import nodeResolve from '@rollup/plugin-node-resolve';
import builtins from 'rollup-plugin-node-builtins';
import terser from '@rollup/plugin-terser';
import sourcemaps from 'rollup-plugin-sourcemaps';
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
  'zod'
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
      // comment out the eslint plugin till @rollup/plugin-eslint starts to support ESLint v9+ flat config 
      // eslint({
      //   throwOnError: true, 
      //   useEslintrc: false,
      //   overrideConfig: {
      //     parserOptions: {
      //       project: './tsconfig.json',
      //     },
      //   },
      // }),
      nodeResolve({
        preferBuiltins: true,
        exportConditions: ['node'], // Add node export condition
      }),
      commonjs(), // Add commonjs plugin to handle CommonJS modules
      builtins(),
      terser({
        format: {
          comments: false
        },
      }),
      sourcemaps(),
    ]
  }
];
