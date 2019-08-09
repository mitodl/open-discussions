const { babelSharedLoader } = require("../../webpack.config.shared")
const idlUtils = require("jsdom/lib/jsdom/living/generated/utils")
const whatwgURL = require("whatwg-url")
const uuid = require("uuid/v4")

babelSharedLoader.query.presets = [
  "@babel/preset-env",
  "@babel/preset-react",
  "@babel/preset-flow"
]

require("core-js/stable")
require("regenerator-runtime/runtime")

// window and global must be defined here before React is imported
require("jsdom-global")(undefined, {
  url: "http://fake/"
})

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

const changeURL = (window, urlString) => {
  const doc = idlUtils.implForWrapper(window._document)
  doc._URL = whatwgURL.parseURL(urlString)
  doc._origin = whatwgURL.serializeURLOrigin(doc._URL)
}

// sketchy polyfill :/
URL.createObjectURL = function() {
  const url = new URL("http://fake/")
  url.path = []
  const objectURL = `blob:${whatwgURL.serializeURL(url)}/${uuid()}`
  return objectURL
}

// We need to explicitly change the URL when window.location is used
Object.defineProperty(window, "location", {
  set: value => {
    if (!value.startsWith("http")) {
      value = `http://fake${value}`
    }
    changeURL(window, value)
  }
})

require("@babel/register")(babelSharedLoader.query)
