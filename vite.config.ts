import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const localDataFile = resolve(process.cwd(), 'data/overtime-records.json')

function localDataPlugin() {
  return {
    name: 'serve-overtime-data',
    configureServer(server: { middlewares: { use: (path: string, handler: (request: unknown, response: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body: string) => void }, next: () => void) => void) => void } }) {
      server.middlewares.use('/data/overtime-records.json', (_request, response, next) => {
        try {
          response.statusCode = 200
          response.setHeader('Content-Type', 'application/json; charset=utf-8')
          response.end(readFileSync(localDataFile, 'utf8'))
        } catch {
          next()
        }
      })
    },
    generateBundle(this: { emitFile: (asset: { type: 'asset'; fileName: string; source: string }) => void }) {
      this.emitFile({ type: 'asset', fileName: 'data/overtime-records.json', source: readFileSync(localDataFile, 'utf8') })
    },
  }
}

export default defineConfig({ base: '/Overtime-Record/', plugins: [react(), localDataPlugin()], server: { host: true }, preview: { host: true } })
