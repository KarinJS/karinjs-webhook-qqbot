import log4js from 'log4js'

log4js.configure({
  appenders: {
    console: {
      type: 'console',
      layout: {
        type: 'pattern',
        pattern: '%[[karin-webhook][%d{hh:mm:ss.SSS}][%4.4p]%] %m',
      },
    },
  },
  categories: { default: { appenders: ['console'], level: 'info' } },
  levels: {
    handler: { value: 15000, colour: 'cyan' },
  },
})

const supportsANSI = process.stdout.isTTY && process.platform !== 'win32'
const red = (text: string) => (supportsANSI ? `\x1b[31m${text}\x1b[0m` : text)
const green = (text: string) => (supportsANSI ? `\x1b[32m${text}\x1b[0m` : text)
const yellow = (text: string) => (supportsANSI ? `\x1b[33m${text}\x1b[0m` : text)
export const logger = Object.assign(log4js.getLogger('default'), { red, green, yellow })
