// rollup.config.mjs - Using .mjs extension to force ES modules mode
import { builtinModules } from 'node:module';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

const isDevelopment = process.env.NODE_ENV === 'development';

const nodeBuiltins = [
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
  'console',
  'process',
];

const external = [
  ...nodeBuiltins,
  /^node:/,
  /^@modelcontextprotocol\/(?:core|server)(?:\/|$)/,
  '@servicenow/sdk',
  'zod',
];

export default [
  {
    input: './src/index.ts',
    external,
    output: [
      {
        file: './dist/index.js',
        format: 'es',
        sourcemap: true,
      },
    ],
    treeshake: false,
    plugins: [
      typescript({ tsconfig: './tsconfig.json' }),
      ...(isDevelopment
        ? []
        : [
            terser({
              format: {
                comments: false,
              },
            }),
          ]),
    ],
  },
];
