const EFPanelID = 'ef-word-detail-panel'
const EFStyledElementTagName = 'eft'
const EFStyledElementHighlightTagName = 'efth'
const EFSynth = window.speechSynthesis
const EFUseFullMatchForcedly = false
const EFLocalServerURL = 'http://localhost:8000'
const EFStoragePrefix = '_ef_'
const EFQuerySelectionsKey_D = 'D'
const EFSpeakSelectionsKey_E = 'E'
const EFQueryHighlightKey_F = 'F'
const EFSpeakHighlightKey_R = 'R'
const EFAutoCloseTab = false

const efpiFontSize = 16
const efpiLineHeight = efpiFontSize + 4

let EFHoverWord: string | null = null

function webpageDeclareItselfAsEn() {
  if (document.documentElement.lang.startsWith('en')) {
    return true
  }
  return false
}

function currentFocusingIsInputElement() {
  for (const tagName of ['INPUT', 'TEXTAREA']) {
    if (tagName === document.querySelector(':focus')?.tagName) {
      return true
    }
  }

  return false
}

async function queryDictMark() {
  return await request<{ dictMark: number }>(`${EFLocalServerURL}/dictMark`, {
    responseType: 'json',
  })
}

async function request<T = any>(
  url: string,
  options: {
    responseType?: 'arraybuffer' | 'blob' | 'json' | undefined
    method?: 'GET' | 'HEAD' | 'POST' | undefined
    headers?: Tampermonkey.RequestHeaders | undefined
    data?: string | undefined
  },
) {
  const { responseType } = options
  return new Promise<T>((_resolve, _reject) => {
    GM_xmlhttpRequest({
      url,
      responseType,
      onerror: error => {
        _reject(error)
      },
      onabort: () => {
        _reject('aborted')
      },
      onload: response => {
        if (response.status === 200) {
          _resolve(response.response)
        } else {
          _reject(response.response)
        }
      },
    })
  })
}

async function loadProfile(): Promise<SiteProfile | null> {
  const response = await request(`${EFLocalServerURL}/profile`, {
    responseType: 'json',
  })

  // return null

  const href = window.location.href

  let profile: SiteProfile | null = null

  if (response.sitesExcluded) {
    for (const exclude of response.sitesExcluded) {
      if (href.includes(exclude)) {
        return null
      }
    }
  }

  for (const site of response.sites) {
    if (href.includes(site)) {
      profile = response.default
      for (const specific of response.siteSpecificConfig) {
        for (const apply of specific.applyTo) {
          if (href.includes(apply)) {
            profile = { ...profile, ...specific }
          }
        }
      }
      return profile
    }
  }

  if (webpageDeclareItselfAsEn()) {
    profile = response.default

    for (const specific of response.siteSpecificConfig) {
      for (const apply of specific.applyTo) {
        if (href.includes(apply)) {
          profile = { ...profile, ...specific }
        }
      }
    }
    return profile
  }

  return null

  // const profiles: SiteProfile[] = response

  // let profile: SiteProfile | null = null
  // const href = location.href
  // for (const _profile of profiles) {
  //   for (const _match of _profile.contain) {
  //     if (href.includes(_match)) {
  //       profile = _profile
  //       break
  //     }
  //   }
  // }
  // return profile
}

async function loadDict() {
  return await request(`${EFLocalServerURL}/all`, {
    responseType: 'json',
  })
}

async function _getWordDetail(word: string) {
  return new Promise<any>((_resolve, _reject) => {
    // 1. memory cache
    // 2. localstorage cache
    // 3. http request
    // 4. server -> DB
    // 5. server -> http request
    //   5.1 google translate?
    //   5.2 youdao
    //   5.3 google define?
    //   5.4 deepl?
    //   ...
  })
}

async function main() {
  console.log('EF: ✅ invoking main')

  const __Profile = await loadProfile()
  if (!__Profile) {
    console.log('EF: current page not added in profile')
    return
  }

  // 为什么 ts 编译器没有自动将 Profile 解包?
  const Profile: SiteProfile = __Profile!
  console.log('EF: 🎉 Using:', Profile.name + (Profile.name === 'Default' ? '' : ' and Default'))

  const _initalizeInfo = await loadDict()
  let localDict = _initalizeInfo.dict
  let localDictMark = _initalizeInfo.dictMark

  // 运行时中获取的, 已知的单词, 或字典中不包含的单词
  let WordsInWebpageButNotExistInDict: string[] = []
  function initWIWbNID() {
    WordsInWebpageButNotExistInDict = ['constructor', '__proto__']
  }
  initWIWbNID()

  // 运行时中获取, 在网页中存在, 在字典中存在
  let WordsInDictAndWebpage: IPairedWords = {}

  // 分析网页翻译状态
  const Analysis = {
    runtimePaired: 0,
    runtimeCachePaired: 0,
    runtimeEasyOrNoStored: WordsInWebpageButNotExistInDict.length,
    domChangeCount: 0,
    totalStored: Object.keys(localDict).length,
  }

  function initAnalysis() {
    Analysis.runtimePaired = 0
    Analysis.runtimeCachePaired = 0
    Analysis.runtimeEasyOrNoStored = WordsInWebpageButNotExistInDict.length
    Analysis.domChangeCount = 0
    Analysis.totalStored = Object.keys(localDict).length
  }
  initAnalysis()

  if (
    navigator.userAgent.includes('AppleWebKit') &&
    window.location.href.includes('translate.google.com')
  ) {
    // @ts-ignore
    window.trustedTypes.createPolicy('default', { createHTML: (string, sink) => string })
  }

  // 查询某个单词是被手动添加入了字典
  // 进行运行时缓存操作
  function getWordDetail(wordInWebpage: string): WordDetailResult | null {
    // BUG: https://en.wikipedia.org/wiki/Mydriasis
    // Can not match word "pupil" in first <a>, I don't know why 😂

    // if (wordInWebpage === 'pupil') {
    //   console.log('💥')
    // }

    const word = wordInWebpage.toLowerCase()

    if (WordsInWebpageButNotExistInDict.includes(word)) {
      return null
    }

    // 若之前已经查询该单词, 则直接返回结果
    // 🤔🚧使用这种方法会返回 "constructor"
    if (WordsInDictAndWebpage[word]) {
      Analysis.runtimeCachePaired += 1
      const cachedRuntimeInfo = WordsInDictAndWebpage[word]
      return {
        pairKey: cachedRuntimeInfo.key,
        detail: localDict[cachedRuntimeInfo.key],
        fullPair: cachedRuntimeInfo.fullPair,
        pairIndex: cachedRuntimeInfo.pairIndex,
      }
    }

    let dictResult: Detail | null | undefined = null
    let matchKey: string | null = null
    let pairIndex = 0
    let startIndex = 0
    // pseudocode
    // pseudoco
    // pseudoc
    // pseudo
    // pseudo matched in dict.yaml
    // break
    for (let end = word.length; end > 1; end--) {
      const tempKey = word.substring(startIndex, end)
      if (localDict[tempKey]) {
        dictResult = localDict[tempKey]
        pairIndex = end
        matchKey = tempKey
        break
      }
    }

    // 该单词没有匹配到字典中的项
    if (!dictResult) {
      WordsInWebpageButNotExistInDict.push(word)
      Analysis.runtimeEasyOrNoStored += 1
      return null
    }

    // 在 dict.yaml 中的值是否和 webpage.word 完全匹配
    const fullMatch = word === matchKey

    if (EFUseFullMatchForcedly && !fullMatch) {
      WordsInWebpageButNotExistInDict.push(word)
      Analysis.runtimeEasyOrNoStored += 1
      return null
    }

    // 该单词匹配到了字典中的项, 但是不满足该项要求的全词匹配
    // dict["kin"] = "亲属"
    // webpage word "kind" != 亲属
    if (dictResult.options && dictResult.options.length > 0) {
      if (dictResult.options.includes('FullMatch')) {
        if (!fullMatch) {
          WordsInWebpageButNotExistInDict.push(word)
          Analysis.runtimeEasyOrNoStored += 1
          return null
        }
      }
      if (dictResult.options.includes('NotFull')) {
        if (fullMatch) {
          WordsInWebpageButNotExistInDict.push(word)
          Analysis.runtimeEasyOrNoStored += 1
          return null
        }
      }
    }

    const result: WordDetailResult = {
      detail: dictResult,
      fullPair: fullMatch,
      pairIndex,
      pairKey: matchKey ?? undefined,
    }

    WordsInDictAndWebpage[wordInWebpage] = {
      key: matchKey!,
      fullPair: fullMatch,
      pairIndex,
    }

    Analysis.runtimePaired += 1

    return result
  }

  function panelBasicStyle(): string {
    return ''
  }

  function addWordDetailPanelToPage() {
    const panel = document.createElement('div')
    panel.id = EFPanelID
    document.body.appendChild(panel)
    GM_addStyle(`efpi {font-size:${efpiFontSize}px; line-height:${efpiLineHeight}px}`)
  }

  function drawPanel(
    rect: { height: number; width: number; top: number; left: number },
    word: string,
    event?: MouseEvent,
  ) {
    const info = getWordDetail(word)
    if (!info) {
      return
    }

    const items: string[] = []
    items.push(...info.detail.m.split('|'))

    const panelHeight = items.length * efpiLineHeight

    const shouldDisplayPanelAtTheTopOfEFT = (rect.height + rect.top) / window.innerHeight >= 0.75
    const top = shouldDisplayPanelAtTheTopOfEFT
      ? rect.top - panelHeight
      : rect.top + rect.height + 3

    const shouldDisplayPanelAtTheLeftOfEFT = (rect.width + rect.left) / window.innerWidth >= 0.95

    const panel = document.querySelector('#' + EFPanelID)!
    let finalValue = panelBasicStyle()
    finalValue += `top:${top}px;`
    if (shouldDisplayPanelAtTheLeftOfEFT) {
      // 这样做也不是太好, 我需要知道 panel 不折行所需的 width
      // https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript
      const widthDoNotNeedToBreakLine = 0
      const right = window.innerWidth - rect.left - rect.width
      finalValue += `right:${right}px;`
    } else {
      finalValue += `left:${rect.left}px;`
    }
    finalValue += `opacity: 1;`
    panel.setAttribute('style', finalValue)

    let innerHTML = ''
    for (const _item of items) {
      innerHTML += `<efpi>${_item}</efpi>`
    }
    innerHTML = `<efpis>${innerHTML}</efpis>`
    panel.innerHTML = innerHTML
  }

  function mouseOverFunction(element: HTMLElement, word: string, event?: MouseEvent) {
    drawPanel(element.getBoundingClientRect(), word, event)
  }

  function mouseLeaveFunction(element?: HTMLElement, event?: MouseEvent) {
    const panel = document.querySelector('#' + EFPanelID)!
    let finalValue = ''
    finalValue += `opacity: 0.5;`
    panel.setAttribute('style', finalValue)
  }

  const DoNotMatchList: string[] = [
    EFStyledElementTagName,
    EFStyledElementTagName.toUpperCase(),
    'SCRIPT',
    'SVG',
    'VIDEO',
    'STYLE',
  ]

  if (Profile.notMatchTagName) {
    DoNotMatchList.push(...Profile.notMatchTagName)
  }

  // const classNameCheckArray: string[] = []
  // const idCheckArray: string[] = []
  // const tagNameCheckArray: string[] = []

  /**
   * 核心方法, 查询并替换 Text Node
   */
  function useEFTToReplaceWords(options: { parent: ChildNode }) {
    const { parent } = options
    setTimeout(() => {
      // foreach all childNodes
      for (let i = 0; i < parent.childNodes.length; i++) {
        if (!parent.childNodes[i]) {
          continue
        }
        // 针对 text node, 增加新的 DOM 结构
        // MDN https://developer.mozilla.org/zh-CN/docs/Web/API/Text
        if (parent.childNodes[i].nodeName === '#text') {
          // containTextNode = true
          let indexFlag = 0
          if ((parent.childNodes[i] as Text).length <= 5) {
            continue
          }

          const regex = /[A-z]+/g

          const allWordsInTextNode = (parent.childNodes[i] as Text).textContent?.matchAll(regex)
          if (!allWordsInTextNode) {
            continue
          }

          const display = window.getComputedStyle(parent as HTMLElement).display
          if (display === 'flex') {
            continue
          }

          for (const regexResult of allWordsInTextNode) {
            const word = regexResult[0]

            // 不检查长度小于 3 的词汇
            if (word.length < 3) {
              continue
            }

            // 查询是否已经在字典中添加了该单词
            const info = getWordDetail(word)

            // 字典中没有添加对应单词
            if (!info) {
              continue
            }

            // 程序出错
            if (!info.detail || !info.detail.m) {
              console.error('💥', word)
              console.error(info.detail, info.detail.m)
              return
            }

            const insertIndex = regexResult.index! - indexFlag
            indexFlag = 0
            const insertPlace = (parent.childNodes[i] as Text).splitText(insertIndex)
            insertPlace.textContent = insertPlace.textContent!.substring(word.length)

            // 分割了当前 Text Node, 下次遍历要靠后
            // New DOM added, index ++
            i += 1

            const eft = document.createElement(EFStyledElementTagName)

            const prefix = word.substring(0, info.pairIndex)
            const surfix = word.substring(info.pairIndex)
            const full = `<${EFStyledElementHighlightTagName}>${prefix}</${EFStyledElementHighlightTagName}>${surfix}`
            eft.innerHTML = full
            parent.insertBefore(eft, insertPlace)
            // New DOM added, index ++
            i += 1
            // 分割了当前 text node, 所以下次循环时, 加入分割 text node 的偏移量
            indexFlag += regexResult.index!
            indexFlag += word.length

            // 在鼠标进入标签是, 替换当前核心词汇
            eft.addEventListener('mouseenter', function (this, e) {
              mouseOverFunction(this, word, e)
              EFHoverWord = word
            })

            eft.addEventListener('mouseleave', function (this, e) {
              mouseLeaveFunction(this, e)
              EFHoverWord = null
            })

            Analysis.domChangeCount += 1
          }
        } else {
          const notTextNode = parent.childNodes[i] as HTMLElement
          const nodeName = notTextNode.nodeName
          const nodeId = notTextNode.id
          // 深度搜索 text node
          if (
            !DoNotMatchList.includes(nodeName) &&
            !Profile.notMatchClassName?.includes(notTextNode.className) &&
            EFPanelID !== nodeId
          ) {
            // if (!idCheckArray.includes(nodeId)) {
            //   idCheckArray.push(nodeId)
            // }
            // if (!tagNameCheckArray.includes(nodeName)) {
            //   tagNameCheckArray.push(nodeName)
            // }
            // if (!classNameCheckArray.includes(notTextNode.className)) {
            //   classNameCheckArray.push(notTextNode.className)
            // }

            useEFTToReplaceWords({
              parent: notTextNode,
            })
          }
        }
      }
    })
  }

  // Search text from profile root selectors
  function checkDOMFromSelector(options: { selectors: string[] }) {
    const { selectors } = options
    if (selectors.length === 0) {
      return
    }

    if (selectors.includes('body')) {
      useEFTToReplaceWords({ parent: document.body })
      return
    }

    for (const selector of selectors) {
      document.body.querySelectorAll<HTMLElement>(selector).forEach(element => {
        useEFTToReplaceWords({ parent: element })
      })
    }
  }

  const AnalysisInitialization = JSON.parse(JSON.stringify(Analysis))
  function logDOMChangeCount() {
    setTimeout(() => {
      if (AnalysisInitialization.domChangeCount != Analysis.domChangeCount) {
        AnalysisInitialization.domChangeCount = Analysis.domChangeCount
        console.log('EF:', Analysis.domChangeCount, 'words translated')
      }
    }, 1000)
  }

  let usingProfileStrategies = false

  if (Profile.strategies && Profile.strategies.length > 0) {
    for (const strategy of Profile.strategies) {
      if (strategy === 'immediately') {
        usingProfileStrategies = true
        checkDOMFromSelector({ selectors: Profile.rootSelector })
        logDOMChangeCount()
      } else if (strategy.startsWith('timeout|')) {
        usingProfileStrategies = true
        const options = strategy.split('|')
        const ms = parseFloat(options[1]) * 1000
        setTimeout(() => {
          checkDOMFromSelector({ selectors: Profile.rootSelector })
          logDOMChangeCount()
        }, ms)
        console.log('EF: ⏰ timeout:', ms)
      } else if (strategy.startsWith('interval|')) {
        usingProfileStrategies = true
        const options = strategy.split('|')
        const ms = parseFloat(options[1]) * 1000
        setInterval(() => {
          checkDOMFromSelector({ selectors: Profile.rootSelector })
          logDOMChangeCount()
        }, ms)
        console.log('EF: ⏰ interval:', ms)
      } else {
        console.warn('EF: Unknown strategy: ', strategy)
      }
    }
  }

  if (!usingProfileStrategies) {
    checkDOMFromSelector({ selectors: Profile.rootSelector })
    logDOMChangeCount()
  }

  if (Profile.selectorSpecificStrategy) {
    for (const _specialStrategy of Profile.selectorSpecificStrategy) {
      if (_specialStrategy.strategy.startsWith('interval|')) {
        const options = _specialStrategy.strategy.split('|')
        const ms = parseFloat(options[1]) * 1000
        setInterval(() => {
          checkDOMFromSelector({ selectors: [_specialStrategy.selector] })
        }, ms)
      }
    }
  }

  GM_addStyle(GM_getResourceText('EFCSS'))

  // Load site specific style
  if (Profile.style) {
    Profile.style.forEach(piece => {
      GM_addStyle(piece)
    })
  }

  addWordDetailPanelToPage()

  document.addEventListener('scroll', ev => {
    mouseLeaveFunction()
  })

  // 重置页面变更
  function resetApp() {
    let parentElementHolder: HTMLElement | null = null
    document.querySelectorAll(EFStyledElementTagName).forEach(e => {
      const t = new Text(
        e.innerHTML
          .replaceAll(`<${EFStyledElementHighlightTagName}>`, ``)
          .replaceAll(`</${EFStyledElementHighlightTagName}>`, ``),
      )
      e.replaceWith(t)
      // https://en.wikipedia.org/wiki/Engram_(neuropsychology)
      // 发现这个页面的 History 第一段的 "thus" 这个单词不会在刷新后被遍历到
      // 似乎是 useEFTToReplaceWords 的 bug (遍历 bug)
      // 这里加入了一个 holder, 在重置 DOM 时, normalize 一下父元素
      // 为了减少 normalize 的调用次数, 加了一个 reference: parentElementHolder
      // https://developer.mozilla.org/en-US/docs/Web/API/Node/normalize
      // 暂时没发现非期望的副作用
      if (parentElementHolder !== t.parentElement) {
        parentElementHolder?.normalize()
      }
      parentElementHolder = t.parentElement
    })
    initAnalysis()
    initWIWbNID()
    WordsInDictAndWebpage = {}
  }

  //  监听本地词典变更, 并同步至网页
  setTimeout(() => {
    setInterval(() => {
      queryDictMark().then(info => {
        if (info.dictMark !== localDictMark) {
          console.log('EF: Will refresh page')
          localDictMark = info.dictMark

          loadDict().then(dict => {
            localDict = dict.dict
            resetApp()
            checkDOMFromSelector({ selectors: Profile.rootSelector })
            logDOMChangeCount()
          })
        }
      })
    }, 1000)
  }, 2000)
}

main()

function searchWord(wordOrSentence: string) {
  const isAWord = isSingleWord(wordOrSentence)
  let string = wordOrSentence
  if (isAWord) {
    string = wordOrSentence.replaceAll(' ', '')
  }
  const urlsToBeOpened: string[] = [
    `https://translate.google.com/?tl=zh-CN&text=${string}`,
    `https://www.youdao.com/w/eng/${string}`,
  ]
  // wikitionary 词源
  isAWord && urlsToBeOpened.unshift(`https://en.wiktionary.org/wiki/${string}#Etymology`)

  urlsToBeOpened.forEach(url => {
    const tab = GM_openInTab(url, true)
    if (EFAutoCloseTab) {
      setTimeout(() => {
        if (!tab.closed) {
          tab.close()
        }
      }, 60 * 1000)
    }
  })

  isAWord && GM_setClipboard(string)
  isAWord && speak(string)
}

function addkeyboardListener() {
  const startLength = localStorage.length
  for (let i = 0; i < startLength; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('ef___')) {
      localStorage.removeItem(key)
    }
  }

  document.addEventListener('keypress', ev => {
    if (ev.shiftKey && !ev.altKey && !ev.ctrlKey) {
      if (currentFocusingIsInputElement()) {
        return
      }

      switch (ev.key) {
        case EFSpeakHighlightKey_R:
        case EFSpeakHighlightKey_R.toLowerCase(): {
          if (!EFHoverWord) break
          ev.stopPropagation()
          ev.preventDefault()
          speak(EFHoverWord)
          break
        }
        case EFQueryHighlightKey_F:
        case EFQueryHighlightKey_F.toLowerCase(): {
          if (!EFHoverWord) break
          ev.preventDefault()
          ev.stopPropagation()
          searchWord(EFHoverWord)
          break
        }
        default:
          break
      }

      if (!document.getSelection()) {
        return
      }

      const selection = document.getSelection()!
      let _string = selection.toString()
      const isAWord = isSingleWord(_string)
      if (isAWord) {
        _string = _string.replaceAll(' ', '')
      }
      switch (ev.key) {
        case EFQuerySelectionsKey_D:
        case EFQuerySelectionsKey_D.toLowerCase(): {
          ev.preventDefault()
          ev.stopPropagation()
          searchWord(selection.toString())
          break
        }
        case EFSpeakSelectionsKey_E:
        case EFSpeakSelectionsKey_E.toLowerCase(): {
          ev.preventDefault()
          ev.stopPropagation()
          speak(_string)
          break
        }
        default:
          break
      }
    }
  })
}

function speak(text: string) {
  function synthesis() {
    const utterance = new SpeechSynthesisUtterance(text)
    EFSynth.speak(utterance)
  }

  let rejected = false
  let matched = false
  let timeoutToSynthesis = false

  queryGoogleDefineAudios(text)
    .then(finalUrl => {
      matched = true
      playURL(finalUrl)
    })
    .catch(reason => {
      rejected = true
      if (!timeoutToSynthesis) {
        synthesis()
      }
    })

  setTimeout(() => {
    if (!matched && !rejected) {
      timeoutToSynthesis = true
      synthesis()
    }
  }, 999)
}

function isSingleWord(text: string) {
  const regex = /[A-z]+/g
  const result = text.matchAll(regex)
  const arr = [...result]
  return arr.length === 1
}

const EFPossibleURLPrefix = '//ssl.gstatic.com/dictionary/static/sounds/20200429/'

const EFPossibleURLDict = {
  '🌟--_us_1.mp3': 1,
  '🌟--_us_2.mp3': 1,
  '🌟--_us_1_rr.mp3': 1,
  '_🌟--1_us_1.mp3': 1,
  '🌟--_us_2_rr.mp3': 1,
  '🌟--_us_3.mp3': 1,
  '🌟--_us_4.mp3': 1,
  '🌟--_us_8.mp3': 1,
  '🌟--_us_9.mp3': 1,
  '🌟_--1_us_1.mp3': 1,
  'x🌟--_us_1.mp3': 1,
  // 'https://dict.youdao.com/dictvoice?audio=🌟&type=2': true,
}

async function queryGoogleDefineAudios(text: string) {
  return new Promise<string>((resolve, reject) => {
    if (text.length < 3) {
      reject('EF: too short')
      return
    }

    if (!isSingleWord(text)) {
      reject(`EF: ${text} is not a word`)
      return
    }

    // https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
    const { href } = window.location
    if (
      href.includes('developer.mozilla.org') ||
      href.includes('github.com') ||
      href.includes('datatracker.ietf.org')
    ) {
      reject('CSP error')
      return
    }

    let _text = text.toLowerCase().replaceAll(' ', '')

    const stored = localStorage.getItem(EFStoragePrefix + _text)
    if (stored) {
      resolve(EFPossibleURLPrefix + stored)
      return
    }

    let plurable = [_text]
    if (_text.endsWith('s')) {
      plurable.push(_text.substring(0, _text.length - 1))
    }

    const handles: { [key: string]: Tampermonkey.AbortHandle<void> } = {}

    let possibleURL = Object.keys(EFPossibleURLDict)

    const totalCountWaiting404 = possibleURL.length * plurable.length
    let currentCount404 = 0
    for (let i = 0; i < possibleURL.length; i++) {
      for (let j = 0; j < plurable.length; j++) {
        const tt = plurable[j]
        const u = possibleURL[i]
        const finalUrl =
          EFPossibleURLPrefix + u.replace('🌟', tt).replace(' ', '').replace('%20', '')

        // Well GM_xmlhttpRequest not support this `fetch` feature
        // const controller = new AbortController()
        // const { signal } = controller
        const abortHandle = GM_xmlhttpRequest({
          url: finalUrl,
          nocache: false,
          cookie: undefined,
          responseType: 'blob',
          onload: response => {
            if (response.status === 200) {
              for (const url in handles) {
                if (url !== finalUrl) {
                  handles[url].abort()
                }
                delete handles[url]
              }
              resolve(finalUrl)
              localStorage.setItem(
                EFStoragePrefix + _text,
                finalUrl.replace(EFPossibleURLPrefix, ''),
              )
              setTimeout(() => {
                const anylithsis = localStorage.getItem('analysis')
                if (!anylithsis) {
                  localStorage.setItem('analysis', JSON.stringify({}))
                }
                const info = JSON.parse(localStorage.getItem('analysis') || '{}')
                const count = info[u] || 0
                info[u] = count + 1
                localStorage.setItem('analysis', JSON.stringify(info))
              })
            } else {
              currentCount404 += 1
              if (currentCount404 === totalCountWaiting404) {
                reject('EF: Can not find pronounce from google')
              }
            }
          },
          onerror: err => {
            console.log('EF:', err)
          },
          onabort: () => {},
        })
        handles[finalUrl] = abortHandle
      }
    }
  })
}

function playURL(src: string) {
  const player = new Audio()
  document.body.appendChild(player)
  player.src = src
  player.load()
  player.oncanplay = ev => {
    player.play()
  }
}

addkeyboardListener()

type DetailOptions = 'NotFull' | 'FullMatch'

interface WordDetailResult {
  pairKey?: string
  detail: Detail
  fullPair: boolean
  pairIndex: number
}

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

interface IPairedWords {
  [key: string]: {
    key: string
    fullPair: boolean
    pairIndex: number
    pairKey?: string
  }
}

interface SiteProfile {
  name: string
  // 匹配
  rootSelector: string[]
  // 遍历触发策略
  strategies?: string[]
  // 额外的样式
  style?: string[]
  // theme?: 'Light' | 'Dark'
  selectorSpecificStrategy?: { strategy: string; selector: string }[]
  notMatchTagName?: string[]
  // 未实现/考虑中: 不应该匹配的类名
  notMatchClassName?: string[]
}
