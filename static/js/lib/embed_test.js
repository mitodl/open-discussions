import { assert } from "chai"
import sinon from "sinon"

import { handleTwitterWidgets } from "./embed"

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
})
