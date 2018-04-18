'use strict'

const fs = require('fs')
const ejs = require('ejs')
const path = require('path')
const stream = require('stream')
const pdfjsLib = require('pdfjs-dist')

module.exports = async function pdfTemplate(params) {
  require(getModulePath() + '/vendor/pdfjs/domstubs.js').setStubs(global)
  let data = await readPDF(params.template)
  let doc = await loadDocument(data)
  let pages = await loadPages(doc)

  for (let page of pages) {
    let svg = await getSVG(page)
    getElements(svg)
  }

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

let loadPages = async function(doc) {
  let result = []
  for (let i = 1; i <= doc.pdfInfo.numPages; i++) {
    result.push(await loadPage(doc, i))
  }
  return result
}

let loadPage = async function(doc, pageNum) {
  return doc.getPage(pageNum)
}

let getOperators = async function(page) {
  return page.getOperatorList()
}

let getSVG = async function(page) {
  let operator = await getOperators(page)
  let viewport = page.getViewport(1.0 /* scale */ )
  let svgGfx = new pdfjsLib.SVGGraphics(page.commonObjs, page.objs)
  svgGfx.embedFonts = true
  return svgGfx.getSVG(operator, viewport)
}

let getElements = async function(svg) {
  return svg.getElementsByTagName("*")
}
