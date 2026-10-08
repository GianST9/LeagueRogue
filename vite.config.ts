import preact from '@preact/preset-vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [preact()],
  base: './',
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
