'use strict'

const fs = require('fs')
const ejs = require('ejs')
const path = require('path')
const stream = require('stream')
const pdfjsLib = require('pdfjs-dist')

module.exports = async function pdfTemplate(params) {
  require(getModulePath() + '/vendor/pdfjs/domstubs.js').setStubs(global)
  let data = await readPDF(params.template)
  let pages = await loadDocument(data)

  console.log(pages.pdfInfo)

  return params
}

let getModulePath = function() {
  return process.cwd() + '/node_modules/pdf-template'
}

let readPDF = async function(path) {
  return new Uint8Array(fs.readFileSync(path))
}

let loadDocument = async function(data) {
  return pdfjsLib.getDocument({
    data: data,
    nativeImageDecoderSupport: pdfjsLib.NativeImageDecoding.DISPLAY
  })
}
