import express from 'express'
import { logger } from './logger'
import { WebSocketServer } from 'ws'
import { createServer } from 'node:http'
import { ping, webhook, wsEvent } from './api'
import type { Express } from 'express'
import { getConfig } from './config'

export const app: Express = express()
export const server = createServer(app)
export const socket: WebSocketServer = new WebSocketServer({ server })

export const start = () => {
  const { port, host } = getConfig()
  app.get('/', (req, res) => ping(req, res))
  app.post('/', (req, res) => webhook(req, res))

  wsEvent(socket)
  server.listen(port, host, () => {
    logger.info(`[http] 服务启动成功，正在监听: http://${host}:${port}`)
    logger.info(`[ws] 服务启动成功，正在监听: ws://${host}:${port}/webhook`)
  })
}
