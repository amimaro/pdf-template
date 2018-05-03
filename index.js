'use strict'

const fs = require('fs')
const mustache = require('mustache')
const path = require('path')
const util = require('util')
const stream = require('stream')
const pdfjsLib = require('pdfjs-dist')
const PDFDocument = require('pdfkit')
const SVGtoPDF = require('svg-to-pdfkit')

module.exports = async function pdfTemplate(params) {
  try {
    require(getModulePath() + '/vendor/pdfjs/domstubs.js').setStubs(global)
    let data = await readPDF(params.template)
    let doc = await loadDocument(data)
    let pages = await loadPages(doc, params.data)
    let htmls = getSerializedPages(pages)
    if (params.output !== '')
      writePDF(htmls.join(''), params.output)
    return htmls
  } catch (err) {
    throw err
  }
}

let readPDF = async function(file) {
  if(typeof file === 'string')
    return new Uint8Array(fs.readFileSync(file))
  return file
}

let loadDocument = async function(data) {
  return pdfjsLib.getDocument({
    data: data,
    nativeImageDecoderSupport: pdfjsLib.NativeImageDecoding.DISPLAY
  })
}

let loadPages = async function(doc, data) {
  let result = []
  for (let i = 1; i <= doc.pdfInfo.numPages; i++) {
    let page = await loadPage(doc, i)
    let nodeList = await getSVGNodeList(page)
    let elements = renderElements(nodeList, data)
    result.push(elements)
  }
  return result
}

let loadPage = async function(doc, pageNum) {
  return doc.getPage(pageNum)
}

let getSerializedPages = function(pages) {
  let result = []
  for (let page of pages) {
    result.push(editTags(serialize(page)))
  }
  return result
}

let serialize = function(nodeList) {
  // let serialized = ''
  // let chunk = ''
  // let serializer = nodeList.getSerializer()
  // while ((chunk = serializer.getNext()) !== null) {
  //   serialized += chunk
  // }
  // return serialized
  return nodeList + ''
}

let writePDF = async function(data, path) {
  const pdfStream = fs.createWriteStream(path)
  return new Promise(function(resolve, reject) {
    const pdfDoc = new PDFDocument()
    SVGtoPDF(pdfDoc, data, 0, 0)
    pdfDoc.once('error', reject)
    pdfStream.once('error', reject)
    pdfStream.once('finish', resolve)
    pdfDoc.pipe(pdfStream)
    pdfDoc.end()
  }).catch(function(err) {
    pdfStream.end()
    throw err
  })
}

let getModulePath = function() {
  return process.cwd() == __dirname ? process.cwd() : process.cwd() + '/node_modules/pdf-template'
}

let getOperators = async function(page) {
  return page.getOperatorList()
}

let getSVGNodeList = async function(page) {
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
