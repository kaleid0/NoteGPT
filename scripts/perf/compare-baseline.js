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
  let baseline = { p95_threshold_ms: 2000 }
  if (fs.existsSync(BASELINE_FILE)) {
    baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'))
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

  const latencies = []
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, f), 'utf8'))
      if (typeof data.latency === 'number') latencies.push(data.latency)
    } catch (e) {
      console.warn('Skipping invalid result file', f)
    }
  }

  if (!latencies.length) {
    console.warn('No latency numbers found in result files')
    console.warn('Skipping perf comparison.')
    process.exit(0)
  }

  const p95 = percentile(latencies, 95)
  console.log('Perf summary: samples=', latencies.length, 'p95=', p95, 'ms', 'threshold=', baseline.p95_threshold_ms, 'ms')
  if (p95 > baseline.p95_threshold_ms) {
    console.error(`PERF REGRESSION: p95 ${p95}ms exceeds threshold ${baseline.p95_threshold_ms}ms`)
    process.exit(1)
  }
  console.log('Perf check passed')
  process.exit(0)
}

main()
