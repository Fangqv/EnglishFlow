import * as fs from 'fs'
import { createServer, IncomingMessage, ServerResponse } from 'http'
import { hl_watch } from './shared'
import { getWordDetailHandler } from './word_request'

const dictJSONPath = process.cwd() + `/dist/data/dict.json`
const profileJSONPath = process.cwd() + `/dist/data/profile.json`
const host = 'localhost'
const port = 8000

let serverDictObj: any = {}
let dictMark = 0

hl_watch(dictJSONPath, latestString => {
  try {
    serverDictObj = JSON.parse(latestString)
    dictMark += 1
  } catch (error) {
    console.log('EF: JSON parse error! check your json file!')
  }
})

const eventDispatcher = (req: IncomingMessage, res: ServerResponse) => {
  const option = req.url || ''
  switch (option) {
    case '/all': {
      res.setHeader('Content-Type', 'application/json')
      res.writeHead(200)
      const finalObj = {
        dictMark,
        dict: serverDictObj,
      }
      res.end(JSON.stringify(finalObj))
      break
    }

    case '/dictMark': {
      res.setHeader('Content-Type', 'application/json')
      res.writeHead(200)
      const finalObj = {
        dictMark,
      }
      res.end(JSON.stringify(finalObj))
      break
    }

    case '/profile': {
      res.setHeader('Content-Type', 'application/json')
      res.writeHead(200)
      res.end(fs.readFileSync(profileJSONPath, { encoding: 'utf-8' }))
      break
    }

    case '/word': {
      getWordDetailHandler(req, res, serverDictObj)
      break
    }

    default: {
      res.writeHead(404)
      res.end('')
      break
    }
  }
}

const server = createServer(eventDispatcher)
server.listen(port, host)
