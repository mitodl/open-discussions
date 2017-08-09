// @flow
import { assert } from "chai"
import sinon from "sinon"

import { makeChannelList } from "../factories/channels"
import { makePost, makeChannelPostList } from "../factories/posts"
import { newPostURL } from "../lib/url"
import { actions } from "../actions"
import IntegrationTestHelper from "../util/integration_test_helper"
import type { CreatePostPayload } from "../flow/discussionTypes"

describe("CreatePostPage", () => {
  let helper, listenForActions, renderComponent, currentChannel, channels

  beforeEach(() => {
    channels = makeChannelList(10)
    currentChannel = channels[5]
    helper = new IntegrationTestHelper()
    helper.getChannelStub.returns(Promise.resolve(currentChannel))
    helper.getFrontpageStub.returns(Promise.resolve(makeChannelPostList()))
    listenForActions = helper.listenForActions.bind(helper)
    renderComponent = helper.renderComponent.bind(helper)
  })

  afterEach(() => {
    helper.cleanup()
  })

  const renderPage = () => {
    return renderComponent(newPostURL(currentChannel.name), [
      actions.forms.FORM_BEGIN_EDIT,
      actions.channels.get.requestType,
      actions.channels.get.successType
    ])
  }

  it("attempts to clear form and load channels on mount", () => {
    return renderPage().then(([wrapper]) => {
      assert.include(wrapper.text(), currentChannel.title)
      sinon.assert.calledOnce(helper.getChannelStub)
    })
  })

  for (const isText of [true, false]) {
    it(`submits a ${isText ? "text" : "url"} post`, () => {
      const post = makePost(!isText)
      helper.createPostStub.returns(Promise.resolve(post))

      const makeEvent = (name, value) => ({ target: { value, name } })

      return renderPage().then(([wrapper]) => {
        const title = "Title"
        const text = "Text"
        const url = "http://url.example.com"
        wrapper.find(".title input").simulate("change", makeEvent("title", title))

        if (!isText) {
          wrapper.find(".new-link-post").simulate("click")
        }
        if (isText) {
          wrapper.find(".text textarea").simulate("change", makeEvent("text", text))
        } else {
          wrapper.find(".url input").simulate("change", makeEvent("url", url))
        }

        return listenForActions([actions.posts.post.requestType, actions.posts.post.successType], () => {
          wrapper.find(".submit-post").simulate("submit")
        }).then(() => {
          const payload: CreatePostPayload = { title }
          if (isText) {
            payload.text = text
          } else {
            payload.url = url
          }
          sinon.assert.calledWith(helper.createPostStub, currentChannel.name, payload)
          assert.equal(helper.currentLocation.pathname, newPostURL(currentChannel.name))
        })
      })
    })
  }

  it("goes back when cancel is clicked", () => {
    return renderPage().then(([wrapper]) => {
      assert.equal(helper.currentLocation.pathname, newPostURL(currentChannel.name))

      // mock out front page APIs which we don't care about for this test
      helper.getFrontpageStub.returns(Promise.resolve([]))
      helper.getChannelsStub.returns(Promise.resolve([]))

      wrapper.find(".cancel").simulate("click")
      assert.equal(helper.currentLocation.pathname, "/")
    })
  })
})
