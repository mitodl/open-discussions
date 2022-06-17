// @flow
import sinon from "sinon"
import R from "ramda"
import { assert } from "chai"
import * as fetchFuncs from "redux-hammock/django_csrf_fetch"
import { POST, DELETE } from "redux-hammock/constants"

import {
  getChannelModerators,
  addChannelModerator,
  deleteChannelModerator,
  reportContent,
  getReports
} from "./moderation"
import { makeModerators, makeModerator } from "../../factories/channels"
import { makeReportRecord } from "../../factories/reports"

import type { CommentReport, PostReport } from "../../flow/discussionTypes"

describe("Moderation API", () => {
  let fetchJSONStub, fetchStub, sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    fetchJSONStub = sandbox.stub(fetchFuncs, "fetchJSONWithCSRF")
    fetchStub = sandbox.stub(fetchFuncs, "fetchWithCSRF")
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("reports a comment", async () => {
    const payload: CommentReport = {
      commentId:  "1",
      reason:     "spam",
      reportType: "comment"
    }
    fetchJSONStub.returns(Promise.resolve())

    await reportContent(payload)
    assert.ok(
      fetchJSONStub.calledWith(`/api/v0/reports/`, {
        method: POST,
        body:   JSON.stringify(payload)
      })
    )
  })

  it("reports a post", async () => {
    const payload: PostReport = {
      postId:     "1",
      reason:     "spam",
      reportType: "post"
    }
    fetchJSONStub.returns(Promise.resolve())

    await reportContent(payload)
    assert.ok(
      fetchJSONStub.calledWith(`/api/v0/reports/`, {
        method: POST,
        body:   JSON.stringify(payload)
      })
    )
  })

  it("gets reports", async () => {
    const reports = R.times(makeReportRecord, 5)
    fetchJSONStub.returns(Promise.resolve(reports))

    await getReports("channelName")
    assert.ok(fetchJSONStub.calledWith(`/api/v0/channels/channelName/reports/`))
  })

  describe("channel moderators", () => {
    it("gets a list of moderator", async () => {
      const channelName = "channel_name"
      const moderators = makeModerators()

      fetchJSONStub.returns(Promise.resolve(moderators))

      assert.deepEqual(moderators, await getChannelModerators(channelName))

      assert.ok(
        fetchJSONStub.calledWith(`/api/v0/channels/${channelName}/moderators/`)
      )
    })

    it("adds a moderator", async () => {
      const channelName = "channel_name"
      const moderator = makeModerator()

      fetchJSONStub.returns(Promise.resolve(moderator))

      assert.deepEqual(
        moderator,
        // $FlowFixMe: flowt thinks .email can be undefined
        await addChannelModerator(channelName, moderator.email)
      )

      assert.ok(
        fetchJSONStub.calledWith(`/api/v0/channels/${channelName}/moderators/`)
      )
      assert.deepEqual(fetchJSONStub.args[0][1], {
        method: POST,
        body:   JSON.stringify({
          email: moderator.email
        })
      })
    })

    it("removes a moderator", async () => {
      const channelName = "channel_name"
      const moderator = makeModerator()

      fetchJSONStub.returns(Promise.resolve(moderator))

      await deleteChannelModerator(channelName, moderator.moderator_name)

      assert.ok(
        fetchStub.calledWith(
          `/api/v0/channels/${channelName}/moderators/${moderator.moderator_name}/`
        )
      )
      assert.deepEqual(fetchStub.args[0][1], {
        method: DELETE
      })
    })
  })
})
