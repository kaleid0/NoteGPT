#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const RESULTS_DIR = path.resolve(__dirname, '../../tests/test-results/perf')
const BASELINE_FILE = path.resolve(__dirname, '../../tests/e2e/perf/baseline.json')

function percentile(arr, p) {
  if (!arr.length) return null
  const sorted = arr.slice().sort((a,b)=>a-b)
  const idx = Math.ceil((p/100) * sorted.length) - 1
  return sorted[Math.max(0, Math.min(idx, sorted.length-1))]
}

function main(){
  let baseline = { p95_threshold_ms: 2000, browsers: {} }
  if (fs.existsSync(BASELINE_FILE)) {
    baseline = { ...baseline, ...JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')) }
  }

  if (!fs.existsSync(RESULTS_DIR)) {
    console.warn('No perf results directory found:', RESULTS_DIR)
    console.warn('Skipping perf comparison.')
    process.exit(0)
  }

  const files = fs.readdirSync(RESULTS_DIR).filter(f => f.endsWith('.json'))
  if (!files.length) {
    console.warn('No perf result files found in', RESULTS_DIR)
    console.warn('Skipping perf comparison.')
    process.exit(0)
  }

  // Group latencies by browser
  const byBrowser = {}
  const allLatencies = []
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, f), 'utf8'))
      if (typeof data.latency === 'number') {
        allLatencies.push(data.latency)
        const browser = data.browser || 'unknown'
        if (!byBrowser[browser]) byBrowser[browser] = []
        byBrowser[browser].push(data.latency)
      }
    } catch (e) {
      console.warn('Skipping invalid result file', f)
    }
  }

  if (!allLatencies.length) {
    console.warn('No latency numbers found in result files')
    console.warn('Skipping perf comparison.')
    process.exit(0)
  }

  let hasFailure = false

  // Check per-browser thresholds
  console.log('\n=== Performance Results by Browser ===')
  for (const [browser, latencies] of Object.entries(byBrowser)) {
    const p95 = percentile(latencies, 95)
    const browserBaseline = baseline.browsers?.[browser] || {}
    const threshold = browserBaseline.p95_threshold_ms || baseline.p95_threshold_ms
    const status = p95 <= threshold ? 'PASS' : 'FAIL'
    console.log(`${browser}: samples=${latencies.length} p95=${p95}ms threshold=${threshold}ms [${status}]`)
    if (p95 > threshold) {
      hasFailure = true
    }
  }

  // Overall check
  const overallP95 = percentile(allLatencies, 95)
  console.log(`\nOverall: samples=${allLatencies.length} p95=${overallP95}ms threshold=${baseline.p95_threshold_ms}ms`)

  if (hasFailure) {
    console.error('\nPERF REGRESSION: One or more browsers exceeded threshold')
    process.exit(1)
  }
  console.log('\nPerf check passed for all browsers')
  process.exit(0)
}

main()
