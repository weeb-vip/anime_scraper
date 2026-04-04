import { start } from './server/server.app'

// Prevent unhandled rejections from crashing the process (e.g. puppeteer "Target closed" errors)
process.on('unhandledRejection', (reason: any) => {
  console.error('Unhandled Rejection:', reason?.message || reason)
})

if (require.main === module) {
  start().catch(die)
}

function die(error: Error): Promise<void> {
  // tslint:disable-next-line:no-console
  console.error(error)
  process.exit(1)
}
