import sinon from "sinon"
import { assert } from "chai"

import * as fetchFuncs from "redux-hammock/django_csrf_fetch"

import { getCourse } from "./courses"
import { makeCourse } from "../../factories/courses"

describe("Channels API", () => {
  let fetchJSONStub, sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    fetchJSONStub = sandbox.stub(fetchFuncs, "fetchJSONWithCSRF")
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("gets course", async () => {
    const course = makeCourse()
    fetchJSONStub.returns(Promise.resolve(course))

    const result = await getCourse(course.id)
    assert.ok(fetchJSONStub.calledWith(`/api/v0/courses/${course.id}/`))
    assert.deepEqual(result, course)
  })
})
