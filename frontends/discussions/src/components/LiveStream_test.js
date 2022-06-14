// @flow
/* global SETTINGS: false */
import sinon from "sinon"
import { assert } from "chai"

import LiveStream, { LiveStream as InnerLiveStream } from "./LiveStream"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makeLivestreamEvent } from "../factories/livestream"
import * as embedLib from "../lib/embed"
import { shouldIf } from "../lib/test_utils"

describe("LiveStream", () => {
  let helper, render

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    helper.getLivestreamEventsStub.returns(Promise.resolve({ data: [] }))
    render = helper.configureHOCRenderer(LiveStream, InnerLiveStream, {
      livestream: {
        data: [makeLivestreamEvent()]
      }
    })
  })

  afterEach(() => {
    helper.cleanup()
  })

  //
  ;[true, false].forEach(livestreamUIEnabled => {
    it(`${shouldIf(
      livestreamUIEnabled
    )} call the get method on load if feature flag is ${String(
      livestreamUIEnabled
    )}`, async () => {
      SETTINGS.livestream_ui_enabled = livestreamUIEnabled
      await render()
      assert.equal(livestreamUIEnabled, helper.getLivestreamEventsStub.called)
    })
  })

  it("should not render anything if no live events are present", async () => {
    const { inner } = await render()
    assert.isFalse(inner.find("iframe").exists())
  })

  it("should render an iframe if there is a live event", async () => {
    const urlStub = helper.sandbox
      .stub(embedLib, "livestreamEventURL")
      .returns("http://foo.bar.baz")
    const event = makeLivestreamEvent(true)
    const { inner } = await render({
      livestream: {
        data: [event]
      }
    })
    const iframe = inner.find("iframe")
    const { src } = iframe.props()
    assert.equal(src, "http://foo.bar.baz")
    sinon.assert.calledWith(urlStub, event.ownerAccountId, event.id)
  })
})
