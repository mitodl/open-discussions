const { babelSharedLoader } = require("../../webpack.config.shared")
const sinon = require("sinon")
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

// mock HTML5 audio component for amplitudejs
global.Audio = class Audio {
  constructor(url) {
    this.url = url
    this.paused = true
    this.duration = NaN
    this._loaded = false
    this._playStub = sinon.stub()
    this._pauseStub = sinon.stub()
    this._addEventListenerStub = sinon.stub()
    this._removeEventListenerStub = sinon.stub()
  }

  load() {
    window.dispatchEvent(new Event("loadedmetadata"))
    window.dispatchEvent(new Event("canplaythrough"))
  }

  play() {
    this.paused = false
    window.dispatchEvent(new Event("play"))
    this._playStub()
  }

  pause() {
    this.paused = true
    window.dispatchEvent(new Event("pause"))
    this._pauseStub()
  }

  addEventListener() {
    this._addEventListenerStub()
  }

  removeEventListener() {
    this._removeEventListenerStub()
  }
}

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
