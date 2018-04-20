'use strict'

const fs = require('fs')
const mustache = require('mustache')
const path = require('path')
const util = require('util')
const stream = require('stream')
const pdfjsLib = require('pdfjs-dist')

module.exports = async function pdfTemplate(params) {
  try {
    require(getModulePath() + '/vendor/pdfjs/domstubs.js').setStubs(global)

    let data = await readPDF(params.template)
    let doc = await loadDocument(data)
    let pages = await loadPages(doc)
    let result = []
    let i = 1
    for (let page of pages) {
      let svg = await getSVG(page)
      let elements = renderElements(svg, params.data)
      result.push(elements)
      i++
    }
    
    console.log(serialize(result[0]))
  } catch (err) {
    console.error(`An error occured: ${err}`)
    return false
  }

  return true
}

let serialize = function(nodeList) {
  let serialized = ''
  let chunk = ''
  let serializer = nodeList.getSerializer()
  while((chunk = serializer.getNext()) !== null) {
    serialized += chunk
  }
  return serialized
}

let getModulePath = function() {
  return process.cwd() == __dirname ? process.cwd() : process.cwd() + '/node_modules/pdf-template'
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
  let operators = await getOperators(page)
  let viewport = page.getViewport(1.0 /* scale */ )
  let svgGfx = new pdfjsLib.SVGGraphics(page.commonObjs, page.objs)
  svgGfx.embedFonts = true
  return svgGfx.getSVG(operators, viewport)
}

let renderElements = function(nodeList, data) {
  for (let node of nodeList.childNodes) {
    if (node.childNodes.length > 0) {
      renderElements(node, data) // List childNodes recursively
    }
    if (node.textContent.length > 0) {
      node.textContent = render(node.textContent, data)
    }
  }
  return nodeList
}

let render = function(template, data) {
  return mustache.render(template, data);
}
