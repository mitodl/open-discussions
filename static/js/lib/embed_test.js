import { assert } from "chai"
import sinon from "sinon"

import { handleTwitterWidgets, hasIframe } from "./embed"

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
})
