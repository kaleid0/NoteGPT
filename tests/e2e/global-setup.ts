import { spawn } from 'child_process'
import * as net from 'net'
import * as path from 'path'

let serverProcess: ReturnType<typeof spawn> | null = null

async function isPortOpen(port: number, timeout = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    const timer = setTimeout(() => {
      socket.destroy()
      resolve(false)
    }, timeout)

    socket.connect(port, '127.0.0.1', () => {
      clearTimeout(timer)
      socket.destroy()
      resolve(true)
    })

    socket.on('error', () => {
      clearTimeout(timer)
      resolve(false)
    })
  })
}

async function waitForPort(port: number, timeout = 30000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await isPortOpen(port)) {
      return
    }
    await new Promise((res) => setTimeout(res, 500))
  }
  throw new Error(`Backend server did not start on port ${port} within ${timeout}ms`)
}

export default async () => {
  // Check if backend is already running (e.g., via Vite HMR or npm run dev in parallel)
  const alreadyRunning = await isPortOpen(4000, 1000)
  if (alreadyRunning) {
    console.log('[Global Setup] Backend server already running on port 4000')
    ;(global as any).__serverProcess = null
    return
  }

  console.log('[Global Setup] Starting backend server on port 4000...')

  // Create a clean environment without OPENAI_API_KEY to force mock mode
  const env = { ...process.env }
  delete env.OPENAI_API_KEY

  // Start the backend server via npm run dev from the server directory
  const serverDir = path.resolve('server')
  serverProcess = spawn('npm', ['run', 'dev'], {
    cwd: serverDir,
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: true,
    env,
  })

  // Wait for the server to be ready
  await waitForPort(4000)
  console.log('[Global Setup] Backend server ready on port 4000')

  // Make process global so teardown can access it
  ;(global as any).__serverProcess = serverProcess
}


