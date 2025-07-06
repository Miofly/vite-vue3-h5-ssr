import path from 'node:path'
import { fileURLToPath } from 'node:url'

async function handler(req, res) {
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    res.status(200).send(`2${__dirname}`)
}
