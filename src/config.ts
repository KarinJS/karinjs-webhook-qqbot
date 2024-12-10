import fs from 'node:fs'
import type { WebSocket } from 'ws'

const filePath = process.cwd() + '/config.json'
const blacklistPath = process.cwd() + '/blacklist.json'

const loadConfig = <T> (path: string, defaultConfig: T): T => {
  if (fs.existsSync(path)) {
    const data = fs.readFileSync(path, 'utf-8')
    return JSON.parse(data)
  } else {
    fs.writeFileSync(path, JSON.stringify(defaultConfig, null, 2))
    return defaultConfig
  }
}

type Ws = { appid: string, token: string, socket: WebSocket }
type Http = { appid: string, token: string, push: string, push_token: string }

const blacklist: string[] = loadConfig(blacklistPath, [])
const config: {
  port: number,
  host: string,
  ws: Ws[],
  http: Http[],
} = loadConfig(filePath, {
  port: 7777,
  host: '0.0.0.0',
  http: [],
  ws: [],
})

const list: Record<string, { http: Http[], ws: Ws[] }> = {}

/** 获取基本配置 */
export const getConfig = () => config

/** 获取ip黑名单 */
export const getBlacklist = () => blacklist

/** 添加ip黑名单 */
export const setBlacklist = (ip: string) => {
  blacklist.push(ip)
  fs.writeFileSync(blacklistPath, JSON.stringify(ip, null, 2))
}

for (const ws of config.ws) {
  if (!list[ws.appid]) list[ws.appid] = { http: [], ws: [] }
  list[ws.appid].ws.push(ws)
}

for (const http of config.http) {
  if (!list[http.appid]) list[http.appid] = { http: [], ws: [] }
  list[http.appid].http.push(http)
}

/**
 * 获取单个bot推送配置 优先使用http
 * @param appid bot的appid
 */
export const getBot = (appid: string) => {
  const data = list[appid]
  if (!data) return
  if (data.http.length) return Object.assign(data.http[0], { type: 'http' as const })
  if (data.ws.length) {
    for (const ws of data.ws) {
      if (ws?.socket && ws?.socket?.readyState === ws?.socket?.OPEN) return Object.assign(ws, { type: 'ws' as const })
    }
  }
}

/**
 * 获取http推送列表
 * @param appid bot的appid
 */
export const getPush = (appid: string) => list[appid]
