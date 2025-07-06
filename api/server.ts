import type { RenderType } from '@/types'
import fs from 'node:fs'
import { resolve } from 'node:path'

export default async function handler(req: any, res: any) {
    try {
        // 检查是否是静态资源请求
        const url = req.url || req.originalUrl || '/'
        const isStaticAsset = /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map|webp|avif)$/i.test(url)

        if (isStaticAsset) {
            // 静态资源请求，返回 404 让 Vercel 处理
            res.status(404).end('Not Found')
            return
        }

        // 检查是否是 API 请求
        if (url.startsWith('/api/')) {
            // API 请求，这里可以添加代理逻辑或返回 404
            res.status(404).end('API Not Found')
            return
        }

        // 读取模板和清单文件
        const template = fs.readFileSync(resolve('dist/client/index.html'), 'utf-8')
        const manifest = JSON.parse(fs.readFileSync(resolve('dist/client/.vite/ssr-manifest.json'), 'utf-8'))

        // 导入服务端渲染函数
        const render = (await import('dist/server/entry-server.js')).render

        // 执行服务端渲染
        const { html: appHtml, preloadLinks, headTags } = await render(url, manifest, req) as RenderType

        // 替换模板中的占位符
        const html = template
            .replace('<!--preload-links-->', preloadLinks)
            .replace('<!--app-html-->', appHtml)
            .replace('<!--head-tags-->', headTags)

        // 返回渲染后的 HTML
        res.setHeader('Content-Type', 'text/html')
        res.status(200).end(html)
    }
    catch (error) {
        console.error('Server error:', error)
        res.status(500).json({ error: 'Internal Server Error' })
    }
}
