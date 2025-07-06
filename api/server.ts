import fs from 'node:fs'
import { resolve } from 'node:path'

export default async function handler(req, res) {
    // const app = express()
    // const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const template = fs.readFileSync(resolve('dist/client/index.html'), 'utf-8')
    console.log(template)
    res.status(200).set({ 'Content-Type': 'text/html' }).end(template)

    res.status(200).send(`2${__dirname}`)
}
