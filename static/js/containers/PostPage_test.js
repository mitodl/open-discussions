// @flow
import { assert } from "chai"

import CommentTree from "../components/CommentTree"

import { makePost } from "../factories/posts"
import { makeCommentTree } from "../factories/comments"
import { makeChannel } from "../factories/channels"
import { actions } from "../actions"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("PostPage", function() {
  let helper, renderComponent, post, comments, channel

  beforeEach(() => {
    post = makePost()
    comments = makeCommentTree(post)
    channel = makeChannel()

    helper = new IntegrationTestHelper()
    helper.getPostStub.returns(Promise.resolve(post))
    helper.getChannelStub.returns(Promise.resolve(channel))
    helper.getCommentsStub.returns(
      Promise.resolve({
        postID: post.id,
        data:   comments
      })
    )
    renderComponent = helper.renderComponent.bind(helper)
  })

  afterEach(() => {
    helper.cleanup()
  })

  const renderPage = () =>
    renderComponent(`/channel/${channel.name}/${post.id}/`, [
      actions.posts.get.requestType,
      actions.posts.get.successType,
      actions.comments.get.requestType,
      actions.comments.get.successType,
      actions.channels.get.requestType,
      actions.channels.get.successType
    ])

  it("should fetch post, comments, channel, and render", async () => {
    let [wrapper] = await renderPage()
    assert.deepEqual(wrapper.find(CommentTree).props().comments, comments)
  })
})
