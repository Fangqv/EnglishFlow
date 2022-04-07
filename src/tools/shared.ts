import * as fs from 'fs'

export function hl_readFile(path: string, callback: (data: string) => void) {
  fs.readFile(path, 'utf-8', (err, data) => {
    if (err) {
      console.log(err)
      return
    }
    if (data.length === 0) {
      // That is fucking why?
      // console.log("???", data.length)
      // console.log("!!!", fs.readFileSync(path, 'utf8').length)
      // setTimeout(()=>{
      //   console.log(fs.readFileSync(path, 'utf8').length)
      // }, 10)
      let fuckingWhy = fs.readFileSync(path, 'utf8')
      let fuckNumber = 10
      while (fuckingWhy.length === 0 && fuckNumber > 0) {
        fuckNumber -= 1
        // Why, why I can not found this problem on Google?
        // Nobody faced this problem.
        // So It should by my own bugs.
        // But what's the point???
        // console.log("FUCK")
        fuckingWhy = fs.readFileSync(path, 'utf8')
      }
      // console.log(fuckingWhy.length)
      callback(fuckingWhy)
    } else {
      // console.log('FUCK2')
      callback(data)
    }
  })
}

export function hl_watch(path: string, invoke: (fileString: string) => string | void) {
  const pathLog = path.replace(process.cwd(), '').split('/').pop()
  let fileStringStored = ''

  // console.log(' ⚙️  initializing:', pathLog)
  hl_readFile(path, initResult => {
    if (initResult === undefined || initResult === null) {
      console.error('❌ file string is', initResult)
      return
    }

    const invokeReult = invoke(initResult)
    // console.log(' ⚙️  initialized:', pathLog)
    if (typeof invokeReult === 'string') {
      fileStringStored = invokeReult
    } else {
      fileStringStored = initResult
    }

    // console.log(' 🔃 watching:', pathLog)
    fs.watch(path, 'utf-8', event => {
      if (event !== 'change') return
      hl_readFile(path, watchResult => {
        if (watchResult === undefined || watchResult === null) {
          console.error('❌ file string is', watchResult)
          return
        }

        if (fileStringStored === watchResult) {
          return
        }

        fileStringStored = watchResult

        const invokeReult = invoke(watchResult)
        if (typeof invokeReult === 'string') {
          fileStringStored = invokeReult
        }
      })
    })
  })
}
