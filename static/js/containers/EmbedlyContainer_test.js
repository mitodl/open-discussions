// @flow
import sinon from "sinon"
import { assert } from "chai"

import EmbedlyContainer, {
  EmbedlyContainer as InnerEmbedlyContainer
} from "./EmbedlyContainer"

import { makeTweet } from "../factories/embedly"
import IntegrationTestHelper from "../util/integration_test_helper"
import * as embedUtil from "../lib/embed"
import { wait } from "../lib/util"

describe("EmbedlyContainer", () => {
  let helper,
    render,
    url,
    embedlyResponse,
    ensureTwitterEmbedJSStub,
    handleTwitterWidgetsStub
  beforeEach(() => {
    url = "https://example.com"
    embedlyResponse = {
      response: makeTweet()
    }
    helper = new IntegrationTestHelper()
    ensureTwitterEmbedJSStub = helper.sandbox.stub(
      embedUtil,
      "ensureTwitterEmbedJS"
    )
    handleTwitterWidgetsStub = helper.sandbox.stub(
      embedUtil,
      "handleTwitterWidgets"
    )
    helper.getEmbedlyStub.returns(Promise.resolve(embedlyResponse))
    render = helper.configureHOCRenderer(
      EmbedlyContainer,
      InnerEmbedlyContainer,
      {
        embedly: {
          data: new Map([[url, embedlyResponse.response]])
        }
      },
      {
        url
      }
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("renders, calling the proper initialization function", async () => {
    const { inner } = await render()
    assert.isTrue(inner.find("Embedly").exists())
    assert.deepEqual(
      inner.find("Embedly").prop("embedly"),
      embedlyResponse.response
    )
    sinon.assert.calledWith(ensureTwitterEmbedJSStub)
  })

  it("fetches on load and on url change", async () => {
    await render()
    // let getEmbedlyStub resolve and fetch continue execution
    await wait(0)
    sinon.assert.calledWith(helper.getEmbedlyStub, url)
    sinon.assert.calledWith(handleTwitterWidgetsStub, embedlyResponse)
  })

  it("fetches on url change", async () => {
    const prevUrl = "http://example.com/previous_url"
    const { inner } = await render(
      {},
      {
        url: prevUrl
      }
    )
    helper.getEmbedlyStub.reset()
    helper.getEmbedlyStub.returns(Promise.resolve(embedlyResponse))

    inner.instance().componentDidUpdate({ url })
    // let getEmbedlyStub resolve and fetch continue execution
    await wait(0)
    sinon.assert.calledWith(helper.getEmbedlyStub, prevUrl)
  })

  it("does not fetch if the url is invalid and it won't render anything", async () => {
    url = "invalid"
    const { inner } = await render({}, { url })
    assert.isFalse(inner.find("Embedly").exists())
    assert.equal(helper.getEmbedlyStub.callCount, 0)
    sinon.assert.calledWith(ensureTwitterEmbedJSStub)
  })
})
