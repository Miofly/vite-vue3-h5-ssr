// server.prod.ts
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

async function createServer() {
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const resolve = p => path.resolve(__dirname, p)
    const template = fs.readFileSync(resolve('client/index.html'), 'utf-8')
    const manifest = JSON.parse(fs.readFileSync(resolve('client/.vite/ssr-manifest.json'), 'utf-8'))
    const app = express()
    logger.token('remote-addr', (req) => {
        return requestIp.getClientIp(req) || 'unknown'
    })
    logger.token('date', () => {
        return UTC2Date(void 0, 'yyyy-mm-dd hh:ii:ss.SSS')
    })
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
    app.use(compression())
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
    app.use(
        serveStatic(resolve('client'), {
            index: false,
        }),
    )
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))
    app.use(cookieParser())
    app.use('/{*default}', async (req, res) => {
        try {
            const url = req.originalUrl
            const render = (await import('./server/entry-server.js')).render
            const { html: appHtml, preloadLinks, headTags } = await render(url, manifest, req)
            const html = template.replace('<!--preload-links-->', preloadLinks).replace('<!--app-html-->', appHtml).replace('<!--head-tags-->', headTags)
            res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
        }
        catch (e) {
            const err = e
            console.log(err.stack)
            res.status(500).end(err.stack)
        }
    })
    return { app }
}
const port = 7775
createServer().then(({ app }) => app.listen(port, () => {
    console.log(`\u76D1\u542C: http://localhost:${port}`)
}))
export {
    createServer,
}
