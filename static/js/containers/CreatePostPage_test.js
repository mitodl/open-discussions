// @flow
import { assert } from "chai"
import sinon from "sinon"

import { makeModerators, makeChannelList } from "../factories/channels"
import { makeCommentsResponse } from "../factories/comments"
import { makePost, makeChannelPostList } from "../factories/posts"
import { newPostURL } from "../lib/url"
import { actions } from "../actions"
import IntegrationTestHelper from "../util/integration_test_helper"
import { formatTitle } from "../lib/title"
import { makeArticle, makeTweet } from "../factories/embedly"
import { wait } from "../lib/util"
import * as embedUtil from "../lib/embed"

import type { CreatePostPayload } from "../flow/discussionTypes"

describe("CreatePostPage", () => {
  let helper,
    listenForActions,
    renderComponent,
    currentChannel,
    channels,
    post,
    commentsResponse,
    article,
    twitterEmbedStub

  const makeEvent = (name, value) => ({ target: { value, name } })

  const setTitle = (wrapper, title) =>
    wrapper
      .find(".titlefield textarea")
      .simulate("change", makeEvent("title", title))

  const setText = (wrapper, text) =>
    wrapper.find(".text textarea").simulate("change", makeEvent("text", text))

  const setUrl = (wrapper, url) =>
    wrapper.find(".url input").simulate("change", makeEvent("url", url))

  const setLinkPost = wrapper =>
    wrapper.find(".new-link-post").simulate("click")

  const submitPost = wrapper => wrapper.find(".submit-post").simulate("submit")

  beforeEach(() => {
    channels = makeChannelList(10)
    currentChannel = channels[0]
    post = makePost()
    commentsResponse = makeCommentsResponse(post, 3)
    article = makeArticle()
    helper = new IntegrationTestHelper()
    helper.getChannelStub.returns(Promise.resolve(currentChannel))
    helper.getFrontpageStub.returns(
      Promise.resolve({ posts: makeChannelPostList() })
    )
    helper.getChannelsStub.returns(Promise.resolve(channels))
    helper.getPostStub.returns(Promise.resolve(post))
    helper.getChannelModeratorsStub.returns(Promise.resolve(makeModerators()))
    helper.getCommentsStub.returns(Promise.resolve(commentsResponse))
    helper.getEmbedlyStub.returns(
      Promise.resolve({ url: post.url, response: article })
    )
    listenForActions = helper.listenForActions.bind(helper)
    renderComponent = helper.renderComponent.bind(helper)
    twitterEmbedStub = helper.sandbox.stub(embedUtil, "ensureTwitterEmbedJS")
    window.twttr = {
      widgets: { load: helper.sandbox.stub() }
    }
  })

  afterEach(() => {
    helper.cleanup()
  })

  const renderPage = (url = null) => {
    return renderComponent(
      url || newPostURL(currentChannel.name),
      url
        ? [
          actions.forms.FORM_BEGIN_EDIT,
          actions.subscribedChannels.get.requestType,
          actions.subscribedChannels.get.successType
        ]
        : [
          actions.forms.FORM_BEGIN_EDIT,
          actions.channels.get.requestType,
          actions.channels.get.successType,
          actions.subscribedChannels.get.requestType,
          actions.subscribedChannels.get.successType
        ]
    )
  }

  it("should set the document title", async () => {
    await renderPage()
    assert.equal(document.title, formatTitle("Submit a Post"))
  })

  it("attempts to clear form and load channels on mount", async () => {
    const [wrapper] = await renderPage()
    assert.include(wrapper.text(), currentChannel.title)
    sinon.assert.calledOnce(helper.getChannelStub)
  })

  for (const isText of [true, false]) {
    it(`submits a ${isText ? "text" : "url"} post`, () => {
      const post = makePost(!isText)
      helper.createPostStub.returns(Promise.resolve(post))

      return renderPage().then(async ([wrapper]) => {
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
          await listenForActions(
            [
              actions.forms.FORM_UPDATE,
              actions.embedly.get.requestType,
              actions.embedly.get.successType
            ],
            () => {
              setUrl(wrapper, url)
            }
          )
        }

        return listenForActions(
          [actions.posts.post.requestType, actions.posts.post.successType],
          () => {
            submitPost(wrapper)
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

  it("should load twitter JS on page load", async () => {
    await renderPage()
    assert.ok(twitterEmbedStub.called)
  })

  it("should initialize twitter embed if its a twitter link", async () => {
    helper.getEmbedlyStub.returns(
      Promise.resolve({ url: post.url, response: makeTweet() })
    )

    const [wrapper] = await renderPage()
    setLinkPost(wrapper)

    await listenForActions(
      [
        actions.forms.FORM_UPDATE,
        actions.embedly.get.requestType,
        actions.embedly.get.successType
      ],
      () => {
        setUrl(wrapper, "http://en.foo.bar")
      }
    )

    await wait(100) // 🙃
    assert.ok(window.twttr.widgets.load.called)
  })

  it("should show validation errors when title of post is empty", async () => {
    const [wrapper] = await renderPage()
    submitPost(wrapper)
    assert.equal(
      wrapper.find(".titlefield .validation-message").text(),
      "Title is required"
    )
    setTitle(wrapper, "title")
    submitPost(wrapper)
    assert.lengthOf(wrapper.find(".titlefield .validation-message"), 0)
  })

  it("should show validation errors when body of text post is empty", async () => {
    const [wrapper] = await renderPage()
    submitPost(wrapper)
    assert.equal(
      wrapper.find(".text .validation-message").text(),
      "Post text cannot be empty"
    )
    setText(wrapper, "text")
    submitPost(wrapper)
    assert.lengthOf(wrapper.find(".text .validation-message"), 0)
  })

  it("should show validation errors when the url post is empty", async () => {
    const [wrapper] = await renderPage()
    setLinkPost(wrapper)
    submitPost(wrapper)
    assert.equal(
      wrapper.find(".url .validation-message").text(),
      "Post url cannot be empty"
    )
    setUrl(wrapper, "http://foo.bar")
    submitPost(wrapper)
    assert.lengthOf(wrapper.find(".url .validation-message"), 0)
  })

  it("should show validation errors when no channel is selected", async () => {
    const [wrapper] = await renderPage("/create_post/")
    submitPost(wrapper)
    assert.equal(
      wrapper.find(".channel-select .validation-message").text(),
      "You need to select a channel"
    )
    const select = wrapper.find("select")
    select.simulate("change", { target: { value: channels[6].name } })
    submitPost(wrapper)
    assert.lengthOf(wrapper.find(".channel-select .validation-message"), 0)
  })

  it("goes back when cancel is clicked", async () => {
    const [wrapper] = await renderPage()
    assert.equal(
      helper.currentLocation.pathname,
      newPostURL(currentChannel.name)
    )
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

  it("should render a select with all subreddits", async () => {
    const [wrapper] = await renderPage()
    const select = wrapper.find("select")
    assert.lengthOf(select.find("option"), channels.length + 1)
    assert.deepEqual(
      select.find("option").map(option => {
        const props = option.props()
        return [props.value, props.label]
      }),
      [
        ["", "Select a channel"],
        ...channels.map(channel => [channel.name, channel.title])
      ]
    )
    assert.deepEqual(select.find("option").map(option => option.text()), [
      "Select a channel",
      ...channels.map(channel => channel.title)
    ])
  })

  it("should have the subreddit for the current URL selected", async () => {
    const [wrapper] = await renderPage()
    const select = wrapper.find("select")
    assert.equal(select.props().value, currentChannel.name)
  })

  it("should change the URL when you select a new subreddit", async () => {
    const [wrapper] = await renderPage()
    const select = wrapper.find("select")
    select.simulate("change", { target: { value: channels[6].name } })
    assert.equal(
      helper.currentLocation.pathname,
      `/create_post/${channels[6].name}`
    )
    assert.equal(select.props().value, channels[6].name)
  })

  it("should not add to history when the new subreddit is selected", async () => {
    const [wrapper] = await renderPage()
    const select = wrapper.find("select")
    assert.equal(helper.browserHistory.entries.length, 2)
    select.simulate("change", { target: { value: channels[6].name } })
    assert.equal(helper.browserHistory.entries.length, 2)
  })

  it("should not change URL if you select the placeholder entry", async () => {
    const [wrapper] = await renderPage()
    const select = wrapper.find("select")
    assert.equal(
      helper.currentLocation.pathname,
      `/create_post/${currentChannel.name}`
    )
    // this simulates what happens when you select the placeholder
    select.simulate("change", { target: { value: undefined } })
    assert.equal(
      helper.currentLocation.pathname,
      `/create_post/${currentChannel.name}`
    )
    assert.equal(select.props().value, currentChannel.name)
  })

  it("should render the form without a subreddit selected if URL param is absent", async () => {
    const [wrapper] = await renderPage("/create_post/")
    const select = wrapper.find("select")
    assert.equal(select.props().value, "")
  })

  it("should change URL when you select a new subreddit if URL param is absent", async () => {
    const [wrapper] = await renderPage("/create_post/")
    const select = wrapper.find("select")
    select.simulate("change", { target: { value: channels[6].name } })
    assert.equal(
      helper.currentLocation.pathname,
      `/create_post/${channels[6].name}`
    )
    assert.equal(select.props().value, channels[6].name)
  })
})
