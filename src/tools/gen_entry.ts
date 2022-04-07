import * as fs from 'fs'
import * as os from 'os'
import { hl_watch } from './shared'

const Path = process.argv[2]

// Main script of EnglishFlow
const EFTamplatePath = process.cwd() + '/entry/ef.js'
const EFTargetPath = process.cwd() + '/dist/TM_ef_entry.js'

// Assist script for quick copy
const EFCopyTemplatePath = process.cwd() + '/entry/efcopy.js'
const EFCopyTargetPath = process.cwd() + '/dist/TM_efcopy_entry.js'

hl_watch(EFTamplatePath, string => {
  let replaceText = os.userInfo().username + '/' + Path
  // if (process.platform === 'win32') {
  //   replaceText = replaceText.replaceAll('/', '\\')
  // }
  let newFileString = string.replace(/🚧🚧🚧/g, replaceText)

  if (os.platform() === 'darwin') {
    newFileString = newFileString.replace(/C:\//g, '')
  }

  fs.writeFile(EFTargetPath, newFileString, err => {
    err && console.log(err)
  })
})

hl_watch(EFCopyTemplatePath, string => {
  let replaceText = os.userInfo().username + '/' + Path
  // if (process.platform === 'win32') {
  //   replaceText = replaceText.replaceAll('/', '\\')
  // }
  let newFileString = string.replace(/🚧🚧🚧/g, replaceText)

  if (os.platform() === 'darwin') {
    newFileString = newFileString.replace(/C:\//g, '')
  }

  fs.writeFile(EFCopyTargetPath, newFileString, err => {
    err && console.log(err)
  })
})
