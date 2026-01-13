import { defineConfig } from 'vitest/config'

import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      react: path.resolve(__dirname, 'client/node_modules/react'),
      'react-dom': path.resolve(__dirname, 'client/node_modules/react-dom'),
      'react-router-dom': path.resolve(__dirname, 'client/node_modules/react-router-dom')
    },
    // ensure vitest/vite dedupes react to a single copy
    dedupe: ['react', 'react-dom']
  },
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx,js}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/unit/setup.ts'
  }
})
