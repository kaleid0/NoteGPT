// Polyfills and globals for tests
import { vi, describe, it, expect } from 'vitest'

import '@testing-library/jest-dom'
import path from 'path'

// Ensure performance.now exists in test env
if (!(globalThis as any).performance) {
  ;(globalThis as any).performance = Date
}

// Force single React instance: load client's react/react-dom and insert into require cache
try {
  // Prefer client's installed copy if available (handles non-hoisted installs)
  try {
    const clientReact = require(path.resolve(__dirname, '../../client/node_modules/react'))
    const clientReactDom = require(path.resolve(__dirname, '../../client/node_modules/react-dom'))

    const rootReactResolve = require.resolve('react')
    const rootReactDomResolve = require.resolve('react-dom')

    // overwrite root cached modules so other modules get client's copy
    require.cache[rootReactResolve] = {
      id: rootReactResolve,
      filename: rootReactResolve,
      loaded: true,
      exports: clientReact,
    } as any
    require.cache[rootReactDomResolve] = {
      id: rootReactDomResolve,
      filename: rootReactDomResolve,
      loaded: true,
      exports: clientReactDom,
    } as any
  } catch (clientErr) {
    // If client copy isn't present (hoisted installs), fall back to root-installed packages
    const rootReact = require('react')
    const rootReactDom = require('react-dom')

    const rootReactResolve = require.resolve('react')
    const rootReactDomResolve = require.resolve('react-dom')

    require.cache[rootReactResolve] = {
      id: rootReactResolve,
      filename: rootReactResolve,
      loaded: true,
      exports: rootReact,
    } as any
    require.cache[rootReactDomResolve] = {
      id: rootReactDomResolve,
      filename: rootReactDomResolve,
      loaded: true,
      exports: rootReactDom,
    } as any
  }
} catch (err) {
  // non-fatal; tests may still run if modules already deduped
  // eslint-disable-next-line no-console
  console.warn('Could not force single React instance in tests:', err)
}
