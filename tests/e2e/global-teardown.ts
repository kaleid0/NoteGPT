export default async () => {
  const serverProcess = (global as any).__serverProcess
  if (serverProcess) {
    console.log('[Global Teardown] Stopping backend server...')
    serverProcess.kill('SIGTERM')
    await new Promise((res) => setTimeout(res, 1000))
  }
}
