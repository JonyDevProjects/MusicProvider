import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: 'cjs',
  platform: 'node',
  outDir: 'dist',
  outExtension: () => ({ js: '.js' }),
  external: ['@nuclearplayer/plugin-sdk'],
  noExternal: [/(.*)/], // Bundle all dependencies (lru-cache, etc.) so Nuclear doesn't need external node_modules
  esbuildOptions: (options) => {
    options.conditions = ['browser'];
    options.mainFields = ['browser', 'module', 'main'];
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
