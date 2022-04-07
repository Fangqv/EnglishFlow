import { IncomingMessage, ServerResponse } from 'http'

const EFUseFullMatchForcedly = false

export const getWordDetailHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  serverDictObj: any,
) => {
  let buffer = ''
  req.on('data', chunk => {
    buffer += chunk
  })
  req.on('end', () => {
    try {
      res.setHeader('Content-Type', 'application/json')
      const body = JSON.parse(buffer)
      const detail = getWordDetail(body.w, serverDictObj)
      res.writeHead(200)
      res.end(JSON.stringify({ data: detail }))
    } catch (error) {
      console.log('???')
      console.log(error)
      res.writeHead(500)
      res.end('')
    }
  })
}

const getWordDetail = (word: string, serverDictObj: any) => {
  let dictResult: Detail | null | undefined = null
  let matchKey: string | null = null
  let pairIndex = 0
  let cIndex = 2
  for (; cIndex < word.length + 1; cIndex++) {
    // 从 cIndex 开始依次遍历字典
    // e.g. indecision
    // ind
    // inde
    // indec
    // indeci
    // indecis
    // ...
    // 字典中的项可以有相同的开头, 但是最终只会匹配到最长的值
    // 也为下面的全词匹配做了准备
    const tempKey = word.substring(0, cIndex)
    if (serverDictObj[tempKey]) {
      dictResult = serverDictObj[tempKey]
      pairIndex = cIndex
      matchKey = tempKey
    }
  }

  // 该单词没有匹配到字典中的项
  if (!dictResult) {
    // WordsInWebpageButNotExistInDict.push(word)

    return null
  }

  // 在 dict.yaml 中的值是否和 webpage.word 完全匹配
  const fullMatch = word === matchKey

  if (EFUseFullMatchForcedly && !fullMatch) {
    // WordsInWebpageButNotExistInDict.push(word)

    return null
  }

  // 该单词匹配到了字典中的项, 但是不满足该项要求的全词匹配
  // dict["kin"] = "亲属"
  // webpage word "kind" != 亲属
  if (dictResult.options && dictResult.options.length > 0) {
    if (dictResult.options.includes('FullMatch')) {
      if (!fullMatch) {
        // WordsInWebpageButNotExistInDict.push(word)

        return null
      }
    }
    if (dictResult.options.includes('NotFull')) {
      if (fullMatch) {
        // WordsInWebpageButNotExistInDict.push(word)

        return null
      }
    }
  }

  const result: WordDetailResult = {
    detail: dictResult,
    fullPair: fullMatch,
    pairIndex,
    pairKey: matchKey === null ? undefined : matchKey,
  }

  return result
}

type DetailOptions = 'NotFull' | 'FullMatch'

interface Detail {
  // 单词解释
  m: string
  // 额外选项
  options?: DetailOptions[]
  // 未实现/考虑中: 后缀
  _suffix?: { [key: string]: string }
  // 未实现/考虑中: 提及一下其他特殊情况
  _ref?: any
}

interface WordDetailResult {
  pairKey?: string
  detail: Detail
  fullPair: boolean
  pairIndex: number
}

interface IPairedWords {
  [key: string]: {
    key: string
    fullPair: boolean
    pairIndex: number
    pairKey?: string
  }
}
