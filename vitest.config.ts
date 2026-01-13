import { defineConfig } from 'vitest/config'

import fs from 'fs'
import path from 'path'

const clientReactPath = path.resolve(__dirname, 'client/node_modules/react')
const clientReactDomPath = path.resolve(__dirname, 'client/node_modules/react-dom')
const clientRouterPath = path.resolve(__dirname, 'client/node_modules/react-router-dom')
const rootReactPath = path.resolve(__dirname, 'node_modules/react')
const rootReactDomPath = path.resolve(__dirname, 'node_modules/react-dom')

const resolveAlias: Record<string, string> = {}

if (fs.existsSync(clientReactPath) && fs.existsSync(clientReactDomPath)) {
  resolveAlias.react = clientReactPath
  resolveAlias['react-dom'] = clientReactDomPath
  // Use JSX runtime from the same react package
  resolveAlias['react/jsx-runtime'] = path.join(clientReactPath, 'jsx-runtime.js')
  resolveAlias['react/jsx-dev-runtime'] = path.join(clientReactPath, 'jsx-dev-runtime.js')
} else if (fs.existsSync(rootReactPath) && fs.existsSync(rootReactDomPath)) {
  // Fall back to root-installed copies
  resolveAlias.react = rootReactPath
  resolveAlias['react-dom'] = rootReactDomPath
  resolveAlias['react/jsx-runtime'] = path.join(rootReactPath, 'jsx-runtime.js')
  resolveAlias['react/jsx-dev-runtime'] = path.join(rootReactPath, 'jsx-dev-runtime.js')
}

if (fs.existsSync(clientRouterPath)) {
  resolveAlias['react-router-dom'] = clientRouterPath
} else {
  const rootRouterPath = path.resolve(__dirname, 'node_modules/react-router-dom')
  if (fs.existsSync(rootRouterPath)) {
    resolveAlias['react-router-dom'] = rootRouterPath
  }
}

export default defineConfig({
  resolve: {
    alias: resolveAlias,
    // ensure vitest/vite dedupes react to a single copy
    dedupe: ['react', 'react-dom']
  },
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx,js}', 'tests/integration/client/**/*.test.{ts,tsx,js}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/unit/setup.ts'
  }
})
