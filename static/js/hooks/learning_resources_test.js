// @flow
import { assert } from "chai"
import qs from "query-string"

import { useLearningResourcePermalink } from "./learning_resources"
import { genericTestHarness } from "./test_util"
import IntegrationTestHelper from "../util/integration_test_helper"
import { LR_TYPE_PODCAST } from "../lib/constants"

const PermalinkTester = genericTestHarness(useLearningResourcePermalink)

describe("Learning Resources hooks", () => {
  let helper, render

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    render = helper.configureReduxQueryRenderer(PermalinkTester)
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should not dispatch if no params", async () => {
    const { store } = await render()
    assert.deepEqual(store.getState().ui.LRDrawerHistory, [])
  })

  it("should dispatch if params are present", async () => {
    helper.browserHistory.push(
      `?${qs.stringify({
        lr_id: 1,
        type:  LR_TYPE_PODCAST
      })}`
    )
    const { store } = await render()
    assert.deepEqual(store.getState().ui.LRDrawerHistory, [
      {
        objectId:   "1",
        objectType: LR_TYPE_PODCAST,
        runId:      undefined
      }
    ])
  })
})
