'use strict'

const fs = require('fs')
const mustache = require('mustache')
const path = require('path')
const util = require('util')
const stream = require('stream')
const pdfjsLib = require('pdfjs-dist')

module.exports = async function pdfTemplate(params) {
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

  writeSvgToFile(result[0], 'svg1.svg')

  // console.log(result[0].childNodes[1].childNodes[0].childNodes[0].childNodes[0].textContent)

  return result.length
}

function ReadableSVGStream(options) {
  if (!(this instanceof ReadableSVGStream)) {
    return new ReadableSVGStream(options)
  }
  stream.Readable.call(this, options)
  this.serializer = options.svgElement.getSerializer()
}

util.inherits(ReadableSVGStream, stream.Readable)
// Implements https://nodejs.org/api/stream.html#stream_readable_read_size_1
ReadableSVGStream.prototype._read = function() {
  var chunk
  while ((chunk = this.serializer.getNext()) !== null) {
    if (!this.push(chunk)) {
      return
    }
  }
  this.push(null)
}

function writeSvgToFile(svgElement, filePath) {
  var readableSvgStream = new ReadableSVGStream({
    svgElement: svgElement,
  });
  var writableStream = fs.createWriteStream(filePath);
  return new Promise(function(resolve, reject) {
    readableSvgStream.once('error', reject);
    writableStream.once('error', reject);
    writableStream.once('finish', resolve);
    readableSvgStream.pipe(writableStream);
  }).catch(function(err) {
    readableSvgStream = null; // Explicitly null because of v8 bug 6512.
    writableStream.end();
    throw err;
  });
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
  let operators = await getOperators(page)
  let viewport = page.getViewport(1.0 /* scale */ )
  let svgGfx = new pdfjsLib.SVGGraphics(page.commonObjs, page.objs)
  svgGfx.embedFonts = true
  return svgGfx.getSVG(operators, viewport)
}

let renderElements = function(nodeList, data) {
  for (let node of nodeList.childNodes) {
    if(node.childNodes.length > 0){
      renderElements(node, data) // List childNodes recursively
    }
    if(node.textContent.length > 0){
      node.textContent = render(node.textContent, data)
    }
  }
  return nodeList
}

let render = function(template, data) {
  return mustache.render(template, data);
}
