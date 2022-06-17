import sinon from "sinon"
import idlUtils from "jsdom/lib/jsdom/living/generated/utils"
import whatwgURL from "whatwg-url"
import { v4 as uuid } from "uuid"
import { polyfill as rafPolyfill } from "raf"
import globalJsdom from "jsdom-global"
import crypto from "@trust/webcrypto"

globalJsdom(undefined, { url: "http://fake/" })

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

  addEventListener(name, fn) {
    this._addEventListenerStub()
    window.addEventListener(name, fn)
  }

  removeEventListener(name, fn) {
    this._removeEventListenerStub()
    window.removeEventListener(name, fn)
  }
}

// react got a little more picky about the polyfill for
// requestAnimaltionFrame, see:
// https://reactjs.org/docs/javascript-environment-requirements.html
rafPolyfill(global)
rafPolyfill(window)

// polyfill for the web crypto module
window.crypto = crypto

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
