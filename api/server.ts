import fs from 'node:fs'
import { resolve } from 'node:path'

export default async function handler(req: any, res: any) {
    try {
        // 读取 HTML 模板文件
        const template = fs.readFileSync(resolve('dist/client/index.html'), 'utf-8')

        // 设置正确的 Content-Type 并返回 HTML
        res.setHeader('Content-Type', 'text/html')
        res.status(200).end(template)
    }
    catch (error) {
        console.error('Error reading template:', error)
        res.status(500).json({ error: 'Internal Server Error' })
    }
}
