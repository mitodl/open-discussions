/* global SETTINGS: false */
import { assert } from "chai"
import sinon from "sinon"

import { handleTwitterWidgets, hasIframe, renderEmbedlyCard } from "./embed"

describe("embed utils", () => {
  let twitterLoadStub

  beforeEach(() => {
    twitterLoadStub = sinon.stub()
    window.twttr = {
      widgets: { load: twitterLoadStub }
    }
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
})
