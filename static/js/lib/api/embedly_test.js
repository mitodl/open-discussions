// @flow
import sinon from "sinon"
import * as fetchFuncs from "redux-hammock/django_csrf_fetch"

import { getEmbedly } from "./embedly"

describe("Embedly API", () => {
  let fetchJSONStub, sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    fetchJSONStub = sandbox.stub(fetchFuncs, "fetchJSONWithCSRF")
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("issues a request with an escaped URL param", async () => {
    await getEmbedly("https://en.wikipedia.org/wiki/Giant_panda")
    sinon.assert.calledWith(
      fetchJSONStub,
      "/api/v0/embedly/https%253A%252F%252Fen.wikipedia.org%252Fwiki%252FGiant_panda/"
    )
  })
})
