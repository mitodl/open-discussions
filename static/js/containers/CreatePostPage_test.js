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

  const makeEvent = (name, value) => ({ target: { value, name } })

  const setTitle = (wrapper, title) =>
    wrapper
      .find(".titlefield input")
      .simulate("change", makeEvent("title", title))

  const setText = (wrapper, text) =>
    wrapper.find(".text textarea").simulate("change", makeEvent("text", text))

  const setUrl = (wrapper, url) =>
    wrapper.find(".url input").simulate("change", makeEvent("url", url))

  const setLinkPost = wrapper =>
    wrapper.find(".new-link-post").simulate("click")

  beforeEach(() => {
    channels = makeChannelList(10)
    currentChannel = channels[5]
    helper = new IntegrationTestHelper()
    helper.getChannelStub.returns(Promise.resolve(currentChannel))
    helper.getFrontpageStub.returns(Promise.resolve(makeChannelPostList()))
    helper.getChannelsStub.returns(Promise.resolve([]))
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
      actions.channels.get.successType,
      actions.subscribedChannels.get.requestType
    ])
  }

  it("attempts to clear form and load channels on mount", async () => {
    const [wrapper] = await renderPage()
    assert.include(wrapper.text(), currentChannel.title)
    sinon.assert.calledOnce(helper.getChannelStub)
  })

  for (const isText of [true, false]) {
    it(`submits a ${isText ? "text" : "url"} post`, () => {
      const post = makePost(!isText)
      helper.createPostStub.returns(Promise.resolve(post))

      return renderPage().then(([wrapper]) => {
        const title = "Title"
        const text = "Text"
        const url = "http://url.example.com"
        setTitle(wrapper, title)

        if (!isText) {
          setLinkPost(wrapper)
        }
        if (isText) {
          setText(wrapper, text)
        } else {
          setUrl(wrapper, url)
        }

        return listenForActions(
          [actions.posts.post.requestType, actions.posts.post.successType],
          () => {
            wrapper.find(".submit-post").simulate("submit")
          }
        ).then(() => {
          const payload: CreatePostPayload = { title }
          if (isText) {
            payload.text = text
          } else {
            payload.url = url
          }
          sinon.assert.calledWith(
            helper.createPostStub,
            currentChannel.name,
            payload
          )
          assert.equal(
            helper.currentLocation.pathname,
            newPostURL(currentChannel.name)
          )
        })
      })
    })
  }

  it("should disable the submit button when processing", async () => {
    helper.store.dispatch({
      type: actions.posts.post.requestType
    })
    const [wrapper] = await renderPage()
    const btnProps = wrapper.find(".submit-post").props()
    assert.isTrue(btnProps.disabled)
    assert.equal(btnProps.className, "submit-post disabled")
  })

  it("should disable the submit button when title or body of text post is empty", async () => {
    const [wrapper] = await renderPage()
    ;[
      ["title", "", true],
      ["", "text", true],
      ["", "", true],
      ["title", "text", false]
    ].forEach(([title, text, disabled]) => {
      setTitle(wrapper, title)
      setText(wrapper, text)
      assert.equal(disabled, wrapper.find(".submit-post").props().disabled)
    })
  })

  it("should disable the submit button when url post is empty", async () => {
    const [wrapper] = await renderPage()
    wrapper.find(".new-link-post").simulate("click")
    ;[
      ["title", "", true],
      ["", "url", true],
      ["", "", true],
      ["title", "url", false]
    ].forEach(([title, url, disabled]) => {
      setTitle(wrapper, title)
      setUrl(wrapper, url)
      assert.equal(disabled, wrapper.find(".submit-post").props().disabled)
    })
  })

  it("goes back when cancel is clicked", async () => {
    const [wrapper] = await renderPage()
    assert.equal(
      helper.currentLocation.pathname,
      newPostURL(currentChannel.name)
    )

    // mock out front page APIs which we don't care about for this test
    helper.getFrontpageStub.returns(Promise.resolve([]))
    helper.getChannelsStub.returns(Promise.resolve([]))

    wrapper.find(".cancel").simulate("click")
    assert.equal(helper.currentLocation.pathname, "/")
  })

  it("cancel button onClick handler should preventDefault", async () => {
    const [wrapper] = await renderPage()
    const event = { preventDefault: helper.sandbox.stub() }
    const cancelBtn = wrapper.find(".cancel")
    cancelBtn.props().onClick(event)
    sinon.assert.called(event.preventDefault)
  })
})
