/* global SETTINGS: false */
import { assert } from "chai"
import sinon from "sinon"

import {
  handleTwitterWidgets,
  hasIframe,
  loadEmbedlyPlatform,
  renderEmbedlyCard
} from "./embed"

describe("embed utils", () => {
  let twitterLoadStub, sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    twitterLoadStub = sandbox.stub()
    window.twttr = {
      widgets: { load: twitterLoadStub }
    }
  })

  afterEach(() => {
    sandbox.restore()
  })

  //
  ;[
    [{ response: { provider_name: "Facebook" } }, false],
    [{ response: { provider_name: "Twitter" } }, true]
  ].forEach(([response, shouldCall]) => {
    it(`should ${
      shouldCall ? "" : "not "
    }call the load func when appropriate`, () => {
      handleTwitterWidgets(response)
      assert.equal(shouldCall, twitterLoadStub.called)
    })
  })

  it("hasIframe should check for an iframe!", () => {
    [
      ['<iframe className="iframe-wow"></iframe>', true],
      ['<div className="iframe">iframe here? never!</div', false]
    ].forEach(([htmlString, exp]) => {
      assert.equal(hasIframe(htmlString), exp)
    })
  })

  it("renders static HTML for use with the embedly card API", () => {
    const url = "https://example.com"
    const html = renderEmbedlyCard(url)
    const element = document.createElement("div")
    element.innerHTML = html
    const link = element.querySelector("a")
    assert.equal(link.getAttribute("data-card-chrome"), "0")
    assert.equal(link.getAttribute("data-card-controls"), "0")
    assert.equal(link.getAttribute("data-card-key"), SETTINGS.embedlyKey)
    assert.equal(link.getAttribute("href"), url)
    assert.equal(link.getAttribute("class"), "embedly-card")
  })

  describe("initialization", () => {
    let embedlyStub

    beforeEach(() => {
      document.head.innerHTML = ""
      document.body.innerHTML = ""

      // this expects at least one script element to already exist
      embedlyStub = sandbox.stub()
      global.embedly = embedlyStub

      const script = document.createElement("script")
      document.head.appendChild(script)
    })

    it("loads embedly", () => {
      loadEmbedlyPlatform()
      assert.equal(document.querySelectorAll("script").length, 2)
      const firstScript = document.querySelectorAll("script")[0]
      assert.equal(
        firstScript.getAttribute("src"),
        "http://cdn.embedly.com/widgets/platform.js"
      )
    })
    ;[true, false].forEach(hidesTitle => {
      it(`${
        hidesTitle ? "adds" : "doesn't add"
      } a style element to hide the title`, () => {
        loadEmbedlyPlatform()

        const container = document.createElement("div")
        document.body.append(container)
        if (hidesTitle) {
          container.setAttribute("class", "no-embedly-title")
        }
        const iframe = document.createElement("iframe")
        container.appendChild(iframe)

        const callback = embedlyStub.firstCall.args[2]
        callback(iframe)
        if (hidesTitle) {
          assert.equal(
            iframe.contentDocument.querySelector("style").innerText,
            ".hdr { display: none; }"
          )
        } else {
          assert.equal(
            iframe.contentDocument.querySelectorAll("style").length,
            0
          )
        }
      })
    })
  })
})
