import axios from 'axios'
import { logger } from './logger'
import { getBot, getPush } from './config'
import type { WebSocket, WebSocketServer } from 'ws'
import type { Request, Response } from 'express'

let index = 0

/**
 * get根路由
 * @param req 请求
 * @param res 响应
 */
export const ping = (req: Request, res: Response) => {
  res.status(200).end(JSON.stringify({ code: 0 }))
}

/**
 * webhook
 * @param req 请求
 * @param res 响应
 */
export const webhook = async (req: Request, res: Response) => {
  let response = true
  try {
    const data = await checkAppid(req)
    if (!data) return

    /** 接口初始化 鉴权回调 */
    if (data.body.op === 13) {
      const api = getBot(data.appid)
      if (!api) {
        appidError(`未注册的appid: ${data.appid} body: ${data.rawBody}`)
        return
      }

      let signature: string
      const eventTs = data.body?.d?.event_ts
      const plainToken = data.body?.d?.plain_token

      if (!eventTs || !plainToken) {
        bodyError(`[${data.appid}] 未找到 event_ts 或 plain_token: ${data.rawBody}`)
        return
      }

      if (api.type === 'http') {
        pushEvent(`[http][sign] ${data.appid} body: ${data.rawBody}`)
        signature = await getSginHttp(api.push, data.appid, api.push_token, eventTs, plainToken)
      } else {
        pushEvent(`[ws][sign] ${data.appid} body: ${data.rawBody}`)
        signature = await sendApi(api.socket, 'sign', { appid: data.appid, eventTs, plainToken })
      }

      res.setHeader('Content-Type', 'application/json')
      res.status(200).end(JSON.stringify({ plain_token: plainToken, signature, }))
      response = false
      return
    }

    const list = getPush(data.appid)
    if (!list) {
      appidError(`appid: ${data.appid} 停止推送 body: ${data.rawBody}`)
      return
    }

    const task: Promise<any>[] = []

    for (const api of list.http) {
      const result = axios.post(api.push, {
        headers: Object.assign(req.headers, { authorization: api.push_token }),
        json: data.body,
        timeout: { request: 2000 }
      })
      task.push(result)
    }

    for (const api of list.ws) {
      if (!api?.socket || api.socket.readyState !== api.socket.OPEN) continue
      const result = sendApi(api.socket, 'push', { body: data.body })
      task.push(result)
    }

    let success = 0
    for (const result of await Promise.allSettled(task)) {
      if (result.status === 'fulfilled') success++
    }

    logger.mark(`[推送结果][${data.appid}] 结果: ${success}/${task.length}`)
  } finally {
    response && res.status(200).end()
  }
}

/**
 * 虚假事件
 * @param log 日志
 */
export const fakeEvent = (log: string) => {
  logger.fatal(`${logger.red('[虚假事件]')} ${log}`)
}

/**
 * 头部错误
 * @param log 日志
 */
export const headerError = (log: string) => {
  logger.error(`[头部错误] ${log}`)
}

/**
 * 请求数据错误
 * @param log 日志
 */
export const bodyError = (log: string) => {
  logger.error(`[请求数据错误] ${log}`)
}

/**
 * 未注册的appid
 * @param log 日志
 */
export const appidError = (log: string) => {
  logger.error(`[未注册的appid] ${log}`)
}

/**
 * 推送事件
 * @param log 日志
 */
export const pushEvent = (log: string) => {
  logger.info(`${logger.green('[推送事件]')} ${log}`)
}

/**
 * 错误事件
 * @param log 日志
 */
const errEvent = (log: string) => {
  logger.error(`[ws][连接关闭] ${log}`)
}

/**
 * 判断请求是否合规并返回appid
 * @param req 请求
 */
export const checkAppid = async (req: Request): Promise<{ appid: string; rawBody: string, body: Record<string, any> } | undefined> => {
  const ip = req.socket.remoteAddress
  const appid = req.headers['x-bot-appid'] as string
  const rawBody = await new Promise<string>((resolve) => {
    const raw: string[] = []
    req.on('data', (chunk) => raw.push(chunk))
    req.on('end', () => resolve(raw.join('')))
  })

  if (!appid) {
    fakeEvent(`未找到 x-bot-appid: ${ip} body: ${rawBody}`)
    return
  }

  const userAgent = req.headers['user-agent']
  if (userAgent !== 'QQBot-Callback') {
    fakeEvent(`未找到 User-Agent: ${ip} body: ${rawBody}`)
    return
  }

  const body = JSON.parse(rawBody) || {}
  if (typeof body.op !== 'number') {
    fakeEvent(`非法请求体，未找到 op: ${ip} body: ${rawBody}`)
    return
  }

  return { appid, rawBody, body }
}

/**
 * 获取签名
 * @param url 签名地址
 * @param appid 机器人appid
 * @param token url token
 * @param eventTs 事件时间戳
 * @param plainToken 需要计算的token
 * @returns 返回签名
 */
export const getSginHttp = async (
  url: string,
  appid: string,
  token: string,
  eventTs: string,
  plainToken: string
): Promise<string> => {
  try {
    const result = await axios.post(`${url}/sign`, {
      headers: {
        'user-agent': 'QQBot-Callback',
        'x-bot-appid': appid,
        authorization: token,
      },
      json: { eventTs, plainToken },
    })

    // 返回的是一个json { code: 0, sgin: 'xxxx' }
    if (result.data.status === 'error') {
      logger.error(`[sign][http] 请求错误，签名失败，请检查Bot端是否正常: ${url}`)
      throw new Error(result.data.message)
    }

    return result.data.message
  } catch (error) {
    logger.error(`[sign][http] 请求错误，签名失败，请检查Bot端是否正常: ${url}`)
    throw error
  }
}

/**
 * 发送api请求
 * @param socket websocket
 * @param action 请求类型
 * @param params 请求参数
 * @returns sign返回签名 push返回null
 */
export const sendApi = async <T extends 'sign' | 'push'> (
  socket: WebSocket,
  action: T,
  params: T extends 'sign' ? { appid: string, eventTs: string, plainToken: string } : { body: Record<string, any> }
): Promise<T extends 'sign' ? string : null> => {
  const echo = index++
  const data = JSON.stringify({ action, echo, params })

  if (action === 'push') {
    socket.send(data)
    return null as T extends 'sign' ? string : null
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('timeout'))
    }, 6000)
    process.once(echo.toString(), (data) => {
      clearTimeout(timeout)
      if (data.status === 'ok') {
        return resolve(data.data)
      }
      reject(data)
    })

    socket.send(data)
  })
}

/**
 * websocket事件
 * @param socket websocket
 */
export const wsEvent = (socket: WebSocketServer) => {
  socket.on('connection', (socket, request) => {
    const ip = request.headers['x-real-ip'] || request.socket.remoteAddress
    logger.mark(`[ws][新的连接] 收到请求: ${ip} ${request.url}`)

    const appid = request.headers['x-bot-appid'] as string
    const auth = request.headers['authorization'] as string
    if (!appid || !auth) {
      errEvent(`头部不存在 appid 或 auth: ${ip}`)
      socket.close()
      return
    }

    const list = getPush(appid)
    if (!list) {
      errEvent(`未注册的appid: ${appid}`)
      socket.close()
    }

    let register = false

    list.ws.forEach((cfg, index) => {
      if (appid === cfg.appid && auth === cfg.token) {
        list.ws[index].socket = socket

        socket.on('close', () => {
          logger.mark(`[ws][连接关闭] appid: ${appid} ip: ${ip}`)
          socket.removeAllListeners()
          // @ts-ignore 不删会报错
          list.ws[index].socket = null
        })

        socket.on('error', (err) => {
          errEvent(`发生错误 appid: ${appid} ip: ${ip}`)
          logger.error(err)
          socket.removeAllListeners()
          socket.close()
          // @ts-ignore 不删会报错
          list.ws[index].socket = null
        })

        register = true
        logger.mark(`[ws][连接成功] appid: ${appid} ip: ${ip} token: ${auth}`)
      }
    })

    if (!register) {
      errEvent(`没有找到符合条件的token appid: ${appid} ip: ${ip} token: ${auth}`)
      socket.removeAllListeners()
      socket.close()
      return
    }

    socket.on('message', (event) => {
      const data = JSON.parse(event.toString())
      if (!data.echo) return
      process.emit(data.echo, data.data)
    })
  })
}
