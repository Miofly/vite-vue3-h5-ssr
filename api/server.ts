import type { Request, Response } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { UTC2Date } from '@lincy/utils'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import logger from 'morgan'
import requestIp from 'request-ip'
import serveStatic from 'serve-static'

// 定义 RenderType 接口，避免外部依赖
interface RenderType {
    html: string
    preloadLinks: string
    headTags: string
}

// 创建 Express 应用
async function createServer() {
    // 在 Vercel Functions 环境中正确解析路径
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const resolve = (p: string) => path.resolve(__dirname, p)

    // 读取模板和清单文件
    const template = fs.readFileSync(resolve('../dist/client/index.html'), 'utf-8')
    const manifest = JSON.parse(fs.readFileSync(resolve('../dist/client/.vite/ssr-manifest.json'), 'utf-8'))
    const app = express()

    logger.token('remote-addr', (req) => {
        return requestIp.getClientIp(req) || 'unknown'
    })

    logger.token('date', () => {
        return UTC2Date(undefined, 'yyyy-mm-dd hh:ii:ss.SSS')
    })

    // Node.js 日志中间件
    app.use(
        logger('[:remote-addr] [:date] ":method :url" :status :res[content-length] ":referrer"', {
            skip(req) {
                const skipExt = ['.webmanifes', '.php', '.txt', '.map', '.js', '.css', '.png', 'jpg', '.jpeg', '.gif', '.ttf', '.woff2', '.ico']
                return skipExt.some((ext) => {
                    return req.url.includes(ext)
                })
            },
        }),
    )

    // Node.js 压缩中间件
    app.use(compression())

    // Node.js 代理中间件, 也可以在 nginx 直接配置, 那么将不会走这里的代理中间件
    app.use(
        createProxyMiddleware({
            target: 'http://php.mmxiaowu.com',
            changeOrigin: true,
            pathFilter: ['/api/**'],
            pathRewrite: {
                '^/api': '/api',
            },
            on: {
                proxyReq(proxyReq, req) {
                    proxyReq.setHeader('X-Real-IP', requestIp.getClientIp(req) || 'unknown')
                },
            },
        }),
    )

    // Node.js 静态资源中间件
    app.use(
        serveStatic(resolve('../dist/client'), {
            index: false,
        }),
    )

    // 解析 application/json 中间件
    app.use(express.json())
    // 解析 application/x-www-form-urlencoded 中间件
    app.use(express.urlencoded({ extended: true }))
    // 解析 cookies 中间件
    app.use(cookieParser())

    // 主要路由处理 - 使用 app.all('*') 替代 app.use('*') 以避免 path-to-regexp 问题
    app.all('*', async (req, res) => {
        try {
            const url = req.originalUrl

            // 导入服务端渲染函数
            const entryServerPath = resolve('../dist/server/entry-server.js')
            const render = (await import(entryServerPath)).render

            const { html: appHtml, preloadLinks, headTags } = await render(url, manifest, req) as RenderType

            const html = template
                .replace('<!--preload-links-->', preloadLinks)
                .replace('<!--app-html-->', appHtml)
                .replace('<!--head-tags-->', headTags)

            res.setHeader('Content-Type', 'text/html')
            res.status(200).end(html)
        }
        catch (e: unknown) {
            const err = e as Error
            console.log(err.stack)
            res.status(500).end(err.stack)
        }
    })

    return { app }
}

// Vercel Functions 导出 - 使用 Express 类型
export default async function handler(req: Request, res: Response) {
    try {
        const { app } = await createServer()
        return app(req, res)
    }
    catch (error) {
        console.error('Server error:', error)
        res.status(500).json({ error: 'Internal Server Error' })
    }
}
