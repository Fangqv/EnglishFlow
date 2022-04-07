import * as fs from 'fs'
import * as less from 'less'
import { hl_watch } from './shared'

let __DEV__ = process.argv.includes('dev')
const sourceFileName = 'style.less'
const sourcePath = process.cwd() + '/src/page/' + sourceFileName
const targetPath = process.cwd() + '/dist/' + 'style.css'

if (!fs.existsSync('./dist')) {
  fs.mkdirSync('./dist')
}

if (__DEV__) {
  hl_watch(sourcePath, fileString => {
    less.render(fileString, { paths: ['./'] }, (err, css) => {
      err && console.error(err)
      if (css) {
        fs.writeFileSync(targetPath, css.css)
      }
    })
  })
} else {
  const lessString = fs.readFileSync(sourcePath, 'utf8')
  less.render(lessString).then(output => {
    console.log('✅ less built success!')
    fs.writeFileSync(targetPath, output.css)
  })
}
