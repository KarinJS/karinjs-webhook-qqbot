# @karinjs/plugin-webhook-qqbot

karin plugin qqbot webhook

## 快速开始

```bash
npx @karinjs/plugin-webhook-qqbot
```

### 创建新项目

执行以下命令，按照提示操作即可快速创建一个新项目：

```bash
npx @karinjs/plugin-webhook-qqbot
```

- 你会被询问项目目录名称
- 工具会自动检查目录是否存在
- 自动初始化 package.json
- 自动复制必要文件
- 可选择是否安装额外依赖
- 最后会提示如何启动项目

## 启动项目

创建完成后，进入项目目录并启动：

```bash
cd 你的项目目录
node .
```

# test

`op: 0`:

```json
{
  "host": "tx.com",
  "x-real-ip": "127.0.0.1",
  "x-real-port": "123",
  "x-forwarded-for": "127.0.0.1",
  "remote-host": "127.0.0.1",
  "connection": "close",
  "content-length": "623",
  "x-tps-trace-id": "123",
  "content-type": "application/json",
  "user-agent": "QQBot-Callback",
  "x-signature-timestamp": "1733384468",
  "x-bot-appid": "100000000",
  "x-signature-method": "Ed25519",
  "x-signature-ed25519": "1d4a066fdefa1378857cd2f2646c06a1f34ea1f48cfd375239e21364779f35bf83e9911c1f7f7a25bada7640799416c956deab779cbce70f082e979f44545a0f"
}

```

这是请求头:

| 字段名                | 描述                             |
| --------------------- | -------------------------------- |
| host                  | 请求的目标主机名。               |
| x-real-ip             | 客户端的真实IP地址。             |
| x-real-port           | 客户端的真实端口号。             |
| x-forwarded-for       | 代理服务器转发的客户端IP地址。   |
| remote-host           | 客户端的远程主机地址。           |
| connection            | 表示是否需要保持连接。           |
| content-length        | 请求体的长度。                   |
| x-tps-trace-id        | 用于跟踪请求的唯一标识符。       |
| content-type          | 请求体的媒体类型。               |
| user-agent            | 发起请求的客户端信息。           |
| x-signature-timestamp | 签名的时间戳，用于防止重放攻击。 |
| x-bot-appid           | 机器人的应用ID。                 |
| x-signature-method    | 签名方法，用于验证请求的真实性。 |
| x-signature-ed25519   | 使用Ed25519算法生成的请求签名。  |

## ws推送

> 有两种父类型

### sign 签名计算回调

```json
{
 "echo": "唯一标识符 返回时原样返回",
 "type": "sign",
 "data": {
   "appid": "机器人id",
   "eventTs": "事件发生时间戳",
   "plainToken": "明文token"
 }
}
```

返回格式:

```json
{
 "echo": "唯一标识符 返回收到的",
 "data": {
   "signature": "签名"
 }
}
```

### event 事件推送
  
```json
{
  "type": "event",
  "data": {
    "headers": {
      "host": "tx.com",
      "x-real-ip": "127.0.0.1",
      "x-real-port": "123",
      "x-forwarded-for": "127.0.0.1",
      "remote-host": "127.0.0.1",
      "connection": "close",
      "content-length": "623",
      "x-tps-trace-id": "123",
      "content-type": "application/json",
      "user-agent": "QQBot-Callback",
      "x-signature-timestamp": "1733384468",
      "x-bot-appid": "100000000",
      "x-signature-method": "Ed25519",
      "x-signature-ed25519": "1d4a066fdefa1378857cd2f2646c06a1f34ea1f48cfd375239e21364779f35bf83e9911c1f7f7a25bada7640799416c956deab779cbce70f082e979f44545a0f"
    },
    "event": "事件JSON字符串 如果需要计算签名请不要反序列化，直接使用原始字符串进行计算"
  }
}
```

**此事件不需要回复**

## http推送

http推送与qqbot官方的http`除请求头外`推送一致，请求头中会多了一个`authorization`字段，用于bot端验证请求的合法性。

**请返回200状态码**