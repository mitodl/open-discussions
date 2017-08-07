// @flow
import { assert } from "chai"

import PostList from "../components/PostList"

import { makeChannelPostList } from "../factories/posts"
import { actions } from "../actions"
import { SET_POST_DATA } from "../actions/post"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("HomePage", () => {
  let helper, renderComponent, postList

  beforeEach(() => {
    postList = makeChannelPostList()
    helper = new IntegrationTestHelper()
    helper.getFrontpageStub.returns(Promise.resolve(postList))
    renderComponent = helper.renderComponent.bind(helper)
  })

  afterEach(() => {
    helper.cleanup()
  })

  const renderPage = () =>
    renderComponent("/", [actions.frontpage.get.requestType, actions.frontpage.get.successType, SET_POST_DATA])

  it("should fetch frontpage, set post data, render", async () => {
    let [wrapper] = await renderPage()
    assert.deepEqual(wrapper.find(PostList).props().posts, postList)
  })
})
