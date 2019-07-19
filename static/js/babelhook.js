const { babelSharedLoader } = require("../../webpack.config.shared")
const whatwgURL = require("whatwg-url")
const uuid = require("uuid/v4")

babelSharedLoader.query.presets = [
  "@babel/preset-env",
  "@babel/preset-react",
  "@babel/preset-flow"
]

require("@babel/polyfill")

// jsdom initialization here adapted from from https://airbnb.io/enzyme/docs/guides/jsdom.html
const { JSDOM } = require("jsdom")
const jsdom = new JSDOM("<!doctype html><html><body></body></html>")
const { window } = jsdom

// We need to explicitly change the URL when window.location is used
function copyProps(src, target) {
  Object.defineProperties(target, {
    ...Object.getOwnPropertyDescriptors(src),
    ...Object.getOwnPropertyDescriptors(target)
  })
}

global.window = window
global.document = window.document
global.navigator = {
  userAgent: "node.js"
}
global.requestAnimationFrame = function(callback) {
  return setTimeout(callback, 0)
}
global.cancelAnimationFrame = function(id) {
  clearTimeout(id)
}
copyProps(window, global)

require("mutationobserver-shim")
global.MutationObserver = window.MutationObserver

global.DOMParser = window.DOMParser

// react got a little more picky about the polyfill for
// requestAnimaltionFrame, see:
// https://reactjs.org/docs/javascript-environment-requirements.html
const { polyfill } = require("raf")
polyfill(global)
polyfill(window)

// polyfill for the web crypto module
window.crypto = require("@trust/webcrypto")

// sketchy polyfill :/
URL.createObjectURL = function() {
  const url = new URL("http://fake/")
  url.path = []
  const objectURL = `blob:${whatwgURL.serializeURL(url)}/${uuid()}`
  return objectURL
}

Object.defineProperty(window, "location", {
  set: value => {
    if (!value.startsWith("http")) {
      value = `http://fake${value}`
    }
    jsdom.reconfigure({ url: value })
  }
})

require("@babel/register")(babelSharedLoader.query)
