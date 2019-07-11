import sinon from "sinon"
import { assert } from "chai"

import * as fetchFuncs from "redux-hammock/django_csrf_fetch"

import { getBootcamp, nextUpdate } from "./bootcamps"
import { makeBootcamp } from "../../factories/courses"

describe("Bootcamps API", () => {
  let fetchJSONStub, sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    fetchJSONStub = sandbox.stub(fetchFuncs, "fetchJSONWithCSRF")
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("gets bootcamp", async () => {
    const bootcamp = makeBootcamp()
    fetchJSONStub.returns(Promise.resolve(bootcamp))

    const result = await getBootcamp(bootcamp.id)
    assert.ok(fetchJSONStub.calledWith(`/api/v0/bootcamps/${bootcamp.id}/`))
    assert.deepEqual(result, bootcamp)
  })

  it("nextUpdate", () => {
    assert.equal(nextUpdate("prev", "next"), "next")
  })
})
