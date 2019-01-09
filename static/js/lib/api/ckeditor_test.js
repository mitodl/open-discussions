// @flow
import sinon from "sinon"
import * as fetchFuncs from "redux-hammock/django_csrf_fetch"

import { getCKEditorJWT } from "./ckeditor.js"

describe("CKEditor API", () => {
  let fetchStub, sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    fetchStub = sandbox.stub(fetchFuncs, "fetchWithCSRF")
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should get the token", async () => {
    await getCKEditorJWT()
    sinon.assert.calledWith(fetchStub, "/api/v0/ckeditor/")
  })
})
