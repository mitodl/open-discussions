// @flow
import sinon from "sinon"
import * as fetchFuncs from "redux-hammock/django_csrf_fetch"
import { assert } from "chai"

import { makeChannelPostList } from "../../factories/posts"
import { getFrontpage } from "./frontpage"

describe("Frontpage API", () => {
  let fetchJSONStub, sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    fetchJSONStub = sandbox.stub(fetchFuncs, "fetchJSONWithCSRF")
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("gets the frontpage", async () => {
    const posts = makeChannelPostList()
    fetchJSONStub.returns(Promise.resolve({ posts }))

    const result = await getFrontpage({
      before: undefined,
      after:  undefined,
      count:  undefined
    })

    assert.ok(fetchJSONStub.calledWith(`/api/v0/frontpage/`))
    assert.deepEqual(result.posts, posts)
  })

  it("gets the frontpage with pagination params", async () => {
    const posts = makeChannelPostList()
    fetchJSONStub.returns(Promise.resolve({ posts }))

    const result = await getFrontpage({
      before: "abc",
      after:  "def",
      count:  5
    })
    assert.ok(
      fetchJSONStub.calledWith(
        `/api/v0/frontpage/?after=def&before=abc&count=5`
      )
    )
    assert.deepEqual(result.posts, posts)
  })
})
