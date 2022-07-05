// @flow
/* global SETTINGS: false */
import { assert } from "chai"
import sinon from "sinon"
import * as fetchFuncs from "redux-hammock/django_csrf_fetch"

import {
  CreatePostPage as InnerCreatePostPage,
  CREATE_POST_KEY
} from "../pages/CreatePostPage"
import Dialog from "../components/Dialog"

import { makeChannelList } from "../factories/channels"
import { makeCommentsResponse } from "../factories/comments"
import { makePost, makeChannelPostList } from "../factories/posts"
import { newPostURL } from "../lib/url"
import { actions } from "../actions"
import { SET_BANNER_MESSAGE, HIDE_DIALOG } from "../actions/ui"
import IntegrationTestHelper from "../util/integration_test_helper"
import {
  userCanPost,
  LINK_TYPE_TEXT,
  LINK_TYPE_LINK,
  LINK_TYPE_ARTICLE
} from "../lib/channels"
import { formatTitle } from "../lib/title"
import { makeArticle, makeTweet } from "../factories/embedly"
import { wait } from "../lib/util"
import * as embedUtil from "../lib/embed"
import { shouldIf, makeEvent, mockCourseAPIMethods } from "../lib/test_utils"
import { newPostForm } from "../lib/posts"

import type { CreatePostPayload } from "../flow/discussionTypes"

type CDUTypeOne = [Array<string>, Array<string>, ?string, boolean, boolean]
type CDUTypeTwo = [Array<string>, ?string, boolean, boolean]

describe("CreatePostPage", () => {
  let helper,
    listenForActions,
    renderComponent,
    currentChannel,
    channels,
    post,
    commentsResponse,
    article,
    twitterEmbedStub,
    sandbox,
    scrollToStub

  const setTitle = (wrapper, title) =>
    wrapper
      .find(".titlefield input")
      .simulate("change", makeEvent("title", title))

  const setText = (wrapper, text) => {
    wrapper
      .find("Editor")
      .props()
      .onChange(text)
  }

  const setUrl = (wrapper, url) =>
    wrapper.find(".url input").simulate("change", makeEvent("url", url))

  const setTextPost = wrapper =>
    wrapper.find(".write-something").simulate("click")

  const setLinkPost = wrapper => wrapper.find(".share-a-link").simulate("click")

  const submitPost = wrapper => wrapper.find(".submit-post").simulate("submit")

  beforeEach(() => {
    SETTINGS.ckeditor_upload_url = "/upload/token"
    sandbox = sinon.createSandbox()
    sandbox.stub(fetchFuncs, "fetchWithCSRF")
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
    helper.getCommentsStub.returns(Promise.resolve(commentsResponse))
    helper.getEmbedlyStub.returns(
      Promise.resolve({ url: post.url, response: article })
    )
    helper.getProfileStub.returns(Promise.resolve(""))
    helper.getLivestreamEventsStub.returns(Promise.resolve({ data: [] }))
    listenForActions = helper.listenForActions.bind(helper)
    renderComponent = helper.renderComponent.bind(helper)
    twitterEmbedStub = helper.sandbox.stub(embedUtil, "ensureTwitterEmbedJS")
    window.twttr = {
      widgets: { load: helper.sandbox.stub() }
    }
    scrollToStub = helper.sandbox.stub(window, "scrollTo")
    mockCourseAPIMethods(helper)
  })

  afterEach(() => {
    helper.cleanup()
    sandbox.restore()
  })

  const renderPage = async (url = null) => {
    const [wrapper] = await renderComponent(
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
    return wrapper.update()
  }

  it("should set the document title and load channels", async () => {
    await renderPage()
    assert.equal(document.title, formatTitle("Submit a Post"))
    sinon.assert.calledOnce(helper.getChannelStub)
  })

  //
  ;[
    [[LINK_TYPE_TEXT, LINK_TYPE_LINK, LINK_TYPE_ARTICLE], false],
    [[LINK_TYPE_TEXT, LINK_TYPE_LINK], false],
    [[LINK_TYPE_TEXT, LINK_TYPE_ARTICLE], false],
    [[LINK_TYPE_LINK, LINK_TYPE_ARTICLE], false],
    [[LINK_TYPE_LINK], true],
    [[LINK_TYPE_TEXT], true]
    // NOTE: intentionally left commented out because the article editor needs to be configured somehow
    // [[LINK_TYPE_ARTICLE], true]
  ].forEach(([postTypes, shouldSetPostType]) => {
    it(`${
      shouldSetPostType ? "should" : "shouldn't"
    } set the post type when channel is ${postTypes.toString()}`, async () => {
      currentChannel.allowed_post_types = postTypes
      await renderPage()
      const { postType } = helper.store.getState().forms[CREATE_POST_KEY].value
      assert.equal(postType, shouldSetPostType ? postTypes[0] : null)
    })
  })

  for (const isText of [true, false]) {
    it(`submits a ${isText ? "text" : "url"} post`, async () => {
      const post = makePost(!isText)
      helper.createPostStub.returns(Promise.resolve(post))

      const wrapper = await renderPage()
      const title = "Title"
      const text = "Text"
      const url = "http://url.example.com"
      setTitle(wrapper, title)

      if (isText) {
        setTextPost(wrapper)
      } else {
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

      await listenForActions(
        [actions.posts.post.requestType, actions.posts.post.successType],
        () => {
          submitPost(wrapper)
        }
      )
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
  }

  it("should load twitter JS on page load", async () => {
    await renderPage()
    assert.ok(twitterEmbedStub.called)
  })

  it("should initialize twitter embed if its a twitter link", async () => {
    helper.getEmbedlyStub.returns(
      Promise.resolve({ url: post.url, response: makeTweet() })
    )

    const wrapper = await renderPage()
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

  it("should pass down a function to set show_cover_image to false", async () => {
    const wrapper = await renderPage()
    const { hideCoverImageInput } = wrapper.find("CreatePostForm").props()
    const state = await listenForActions(
      [actions.forms.FORM_UPDATE],
      hideCoverImageInput
    )
    assert.isFalse(state.forms[CREATE_POST_KEY].value.show_cover_image)
  })

  //
  ;[
    ["http", false],
    ["http://", false],
    ["http://foo", false],
    ["http://foo.bar", true],
    ["foo.bar", true],
    ["https://foo.bar/fake_url/fake.html?param1=val1&param2=val2", true],
    ["foo.bar/fake_url/fake.html?param1=val1&param2=val2", true]
  ].forEach(([link, isValid]) => {
    it(`${shouldIf(
      isValid
    )} call Embedly when the URL is ${link}`, async () => {
      const wrapper = await renderPage()
      setLinkPost(wrapper)
      setUrl(wrapper, link)
      await wait(100) // 🙃
      assert.equal(isValid, helper.getEmbedlyStub.calledOnce)
    })
  })

  it("should show validation errors when title of post is empty", async () => {
    const wrapper = await renderPage()
    submitPost(wrapper)
    assert.equal(
      wrapper.find(".titlefield .validation-message").text(),
      "Headline is required"
    )
    setTitle(wrapper, "title")
    setLinkPost(wrapper)
    submitPost(wrapper)
    assert.lengthOf(wrapper.find(".titlefield .validation-message"), 0)
    sinon.assert.calledWith(scrollToStub, {
      top:      0,
      behavior: "smooth"
    })
  })

  it("should show validation errors when the url post is empty", async () => {
    const wrapper = await renderPage()
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
    const wrapper = await renderPage("/create_post/")
    submitPost(wrapper)
    assert.equal(
      wrapper.find(".channel-select .validation-message").text(),
      "You need to select a channel"
    )
    const select = wrapper.find("select")
    select.simulate("change", { target: { value: channels[6].name } })
    submitPost(wrapper)
    assert.lengthOf(wrapper.find(".channel-select .validation-message"), 0)
    sinon.assert.calledWith(scrollToStub, {
      top:      0,
      behavior: "smooth"
    })
  })

  it("should let us set a validation error for invalid cover image", async () => {
    const wrapper = await renderPage("/create_post/")
    const state = await listenForActions([actions.forms.FORM_VALIDATE], () => {
      wrapper
        .find("CreatePostPage")
        .instance()
        .setPhotoError("my error")
    })
    const { errors } = state.forms[CREATE_POST_KEY]
    assert.equal(errors.coverImage, "my error")
  })

  it(`should display a banner message if error on form submit`, async () => {
    helper.createPostStub.returns(Promise.reject({ errorStatusCode: 500 }))
    const wrapper = await renderPage()
    const email = "fakesupport@example.com"
    SETTINGS.support_email = email
    setTitle(wrapper, post.title)
    setTextPost(wrapper)
    setText(wrapper, post.text)

    const state = await listenForActions(
      [
        actions.posts.post.requestType,
        actions.posts.post.failureType,
        SET_BANNER_MESSAGE
      ],
      () => {
        submitPost(wrapper)
      }
    )
    assert.equal(
      state.ui.banner.message,
      `Something went wrong creating your post. Please try again or contact us at ${email}`
    )
  })

  it("goes back when cancel is clicked", async () => {
    const wrapper = await renderPage()
    assert.equal(
      helper.currentLocation.pathname,
      newPostURL(currentChannel.name)
    )
    wrapper
      .find(".new-post-form .cancel")
      .at(0)
      .simulate("click")
    assert.equal(helper.currentLocation.pathname, "/")
  })

  it("cancel button onClick handler should preventDefault", async () => {
    const wrapper = await renderPage()
    const event = { preventDefault: helper.sandbox.stub() }
    const cancelBtn = wrapper.find(".new-post-form .cancel")
    cancelBtn.props().onClick(event)
    sinon.assert.called(event.preventDefault)
  })

  it("should render a select with all subreddits", async () => {
    const wrapper = await renderPage()
    const select = wrapper.find("select")
    const allowedChannels = channels.filter(channel => userCanPost(channel))
    assert.lengthOf(select.find("option"), allowedChannels.length + 1)
    assert.deepEqual(
      select.find("option").map(option => {
        const props = option.props()
        return [props.value, props.label]
      }),
      [
        ["", "Select a channel"],
        ...allowedChannels.map(channel => [channel.name, channel.title])
      ]
    )
    assert.deepEqual(
      select.find("option").map(option => option.text()),
      ["Select a channel", ...allowedChannels.map(channel => channel.title)]
    )
  })

  it("should have the subreddit for the current URL selected", async () => {
    const wrapper = await renderPage()
    const select = wrapper.find("select")
    assert.equal(select.props().value, currentChannel.name)
  })

  it("should change the URL when you select a new subreddit", async () => {
    const wrapper = await renderPage()
    let select = wrapper.find("select")
    select.simulate("change", { target: { value: channels[6].name } })
    assert.equal(
      helper.currentLocation.pathname,
      `/create_post/${channels[6].name}`
    )
    select = wrapper.find("select")
    assert.equal(select.props().value, channels[6].name)
  })

  it("should not add to history when the new subreddit is selected", async () => {
    const wrapper = await renderPage()
    const select = wrapper.find("select")
    assert.equal(helper.browserHistory.entries.length, 2)
    select.simulate("change", { target: { value: channels[6].name } })
    assert.equal(helper.browserHistory.entries.length, 2)
  })

  it("should not change URL if you select the placeholder entry", async () => {
    const wrapper = await renderPage()
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
    const wrapper = await renderPage("/create_post/")
    const select = wrapper.find("select")
    assert.equal(select.props().value, "")
  })

  it("should change URL when you select a new subreddit if URL param is absent", async () => {
    const wrapper = await renderPage("/create_post/")
    let select = wrapper.find("select")

    select.simulate("change", { target: { value: channels[6].name } })
    assert.equal(
      helper.currentLocation.pathname,
      `/create_post/${channels[6].name}`
    )
    wrapper.update()
    select = wrapper.find("select")
    assert.equal(select.props().value, channels[6].name)
  })

  it("has a dialog", async () => {
    const wrapper = await renderPage("/create_post/")
    const dialog = wrapper.find(Dialog)
    const { title, submitText, id } = dialog.props()
    assert.equal(title, "Clear Post Content?")
    assert.equal(submitText, "Yes")
    assert.equal(id, "clear-post-type-dialog")
  })

  it("should show the dialog when the right action is dispatched", async () => {
    const wrapper = await renderPage("/create_post")
    wrapper
      .find("CreatePostPage")
      .instance()
      .openClearPostTypeDialog()
    wrapper.update()
    const dialog = wrapper.find(Dialog)
    assert.isTrue(dialog.props().open)
  })

  it("should pass down hide and cancel functions to the dialog", async () => {
    const { hideDialog, onCancel } = (await renderPage("/create_post"))
      .find(Dialog)
      .props()

    await listenForActions([HIDE_DIALOG, HIDE_DIALOG], () => {
      hideDialog(makeEvent("foo", "bar"))
      onCancel(makeEvent("foo", "bar"))
    })
  })

  it("should pass down a function to null out the post type", async () => {
    const wrapper = await renderPage("/create_post")
    setTextPost(wrapper)
    setText(wrapper, post.text)
    const { onAccept } = wrapper.find(Dialog).props()

    await listenForActions(
      [actions.forms.FORM_UPDATE, actions.forms.FORM_VALIDATE, HIDE_DIALOG],
      () => {
        onAccept()
      }
    )
    assert.deepEqual(
      helper.store.getState().forms[CREATE_POST_KEY].value,
      newPostForm()
    )
  })

  describe("componentDidUpdate logic", () => {
    const ALL_LINK_TYPES = [LINK_TYPE_TEXT, LINK_TYPE_LINK]

    //
    ;[
      // starting with ANY
      [ALL_LINK_TYPES, [LINK_TYPE_TEXT], LINK_TYPE_LINK, true, true],
      [ALL_LINK_TYPES, [LINK_TYPE_TEXT], LINK_TYPE_TEXT, true, false],
      [ALL_LINK_TYPES, [LINK_TYPE_TEXT], null, false, true],
      [ALL_LINK_TYPES, [LINK_TYPE_LINK], LINK_TYPE_LINK, true, false],
      [ALL_LINK_TYPES, [LINK_TYPE_LINK], LINK_TYPE_TEXT, true, true],
      [ALL_LINK_TYPES, [LINK_TYPE_LINK], null, false, true],
      [ALL_LINK_TYPES, ALL_LINK_TYPES, LINK_TYPE_LINK, true, false],
      [ALL_LINK_TYPES, ALL_LINK_TYPES, LINK_TYPE_TEXT, true, false],
      [ALL_LINK_TYPES, ALL_LINK_TYPES, null, false, false],
      // starting with LINK
      [[LINK_TYPE_LINK], [LINK_TYPE_TEXT], LINK_TYPE_LINK, true, true],
      [[LINK_TYPE_LINK], ALL_LINK_TYPES, LINK_TYPE_LINK, true, false],
      [[LINK_TYPE_LINK], ALL_LINK_TYPES, LINK_TYPE_LINK, false, true],
      // starting with TEXT
      [[LINK_TYPE_TEXT], [LINK_TYPE_TEXT], LINK_TYPE_TEXT, true, false],
      [[LINK_TYPE_TEXT], [LINK_TYPE_LINK], LINK_TYPE_TEXT, true, true],
      [[LINK_TYPE_TEXT], ALL_LINK_TYPES, LINK_TYPE_TEXT, true, false],
      [[LINK_TYPE_TEXT], ALL_LINK_TYPES, LINK_TYPE_TEXT, false, true]
    ].forEach(
      ([
        fromChannelTypes,
        toChannelTypes,
        postType,
        hasInput,
        shouldDispatch
      ]: CDUTypeOne) => {
        it(`${shouldIf(
          shouldDispatch
        )} reset form if channel type changes from ${String(
          fromChannelTypes
        )} to ${toChannelTypes.toString()}, postType=${String(
          postType
        )}, user input is ${hasInput ? "not " : ""}empty`, () => {
          const dispatch = helper.sandbox.stub()
          currentChannel.allowed_post_types = fromChannelTypes
          const nextChannel = channels[1]
          nextChannel.allowed_post_types = toChannelTypes
          const page = new InnerCreatePostPage()
          const url =
            hasInput && postType === LINK_TYPE_LINK ? "http://foo.edu" : ""
          const text =
            hasInput && postType === LINK_TYPE_TEXT ? "test text" : ""
          const props: any = {
            dispatch: dispatch,
            channel:  nextChannel,
            postForm: {
              value: {
                postType: postType,
                url,
                text
              }
            }
          }
          page.props = props
          const prevProps = {
            channel: currentChannel
          }

          // $FlowFixMe
          page.componentDidUpdate(prevProps)
          if (shouldDispatch) {
            assert.equal(dispatch.callCount, 1)
            assert.deepEqual(dispatch.args[0][0].payload.value, {
              postType:
                toChannelTypes.length > 1 && !hasInput
                  ? null
                  : toChannelTypes[0],
              url:              "",
              text:             "",
              article_content:  [],
              thumbnail:        null,
              show_cover_image: true
            })
          } else {
            assert.equal(dispatch.callCount, 0)
          }
        })
      }
    )

    //
    ;[
      // if the user hasn't made any input or selected a post type,
      // we should only dispatch when going to a one-post-type channel
      [[LINK_TYPE_LINK, LINK_TYPE_TEXT, LINK_TYPE_ARTICLE], null, false, false],
      [[LINK_TYPE_LINK, LINK_TYPE_TEXT], null, false, false],
      [[LINK_TYPE_LINK, LINK_TYPE_ARTICLE], null, false, false],
      [[LINK_TYPE_TEXT, LINK_TYPE_ARTICLE], null, false, false],
      [[LINK_TYPE_LINK], null, false, true],
      [[LINK_TYPE_TEXT], null, false, true],
      [[LINK_TYPE_ARTICLE], null, false, true],
      // if the user has made an input, without selecting a channel, and that
      // input is allowed on the channel, they should keep it
      [
        [LINK_TYPE_LINK, LINK_TYPE_TEXT, LINK_TYPE_ARTICLE],
        LINK_TYPE_LINK,
        true,
        false
      ],
      [
        [LINK_TYPE_LINK, LINK_TYPE_TEXT, LINK_TYPE_ARTICLE],
        LINK_TYPE_TEXT,
        true,
        false
      ],
      [
        [LINK_TYPE_LINK, LINK_TYPE_TEXT, LINK_TYPE_ARTICLE],
        LINK_TYPE_ARTICLE,
        true,
        false
      ],
      [[LINK_TYPE_LINK, LINK_TYPE_TEXT], LINK_TYPE_LINK, true, false],
      [[LINK_TYPE_LINK, LINK_TYPE_TEXT], LINK_TYPE_TEXT, true, false],
      [[LINK_TYPE_LINK, LINK_TYPE_ARTICLE], LINK_TYPE_LINK, true, false],
      [[LINK_TYPE_LINK, LINK_TYPE_ARTICLE], LINK_TYPE_ARTICLE, true, false],
      [[LINK_TYPE_TEXT, LINK_TYPE_ARTICLE], LINK_TYPE_TEXT, true, false],
      [[LINK_TYPE_TEXT, LINK_TYPE_ARTICLE], LINK_TYPE_ARTICLE, true, false],
      [[LINK_TYPE_LINK], LINK_TYPE_LINK, true, false],
      [[LINK_TYPE_TEXT], LINK_TYPE_TEXT, true, false],
      [[LINK_TYPE_ARTICLE], LINK_TYPE_ARTICLE, true, false],
      // cases where the user has filled out a type, without selecting a channel,
      // and then that post type is not allowed on the channel they select
      // (whether or not they've added any content input)
      [[LINK_TYPE_LINK, LINK_TYPE_TEXT], LINK_TYPE_ARTICLE, false, true],
      [[LINK_TYPE_LINK, LINK_TYPE_ARTICLE], LINK_TYPE_TEXT, false, true],
      [[LINK_TYPE_TEXT, LINK_TYPE_ARTICLE], LINK_TYPE_LINK, false, true],
      [[LINK_TYPE_LINK, LINK_TYPE_TEXT], LINK_TYPE_ARTICLE, true, true],
      [[LINK_TYPE_LINK, LINK_TYPE_ARTICLE], LINK_TYPE_TEXT, true, true],
      [[LINK_TYPE_TEXT, LINK_TYPE_ARTICLE], LINK_TYPE_LINK, true, true]
    ].forEach(([postTypes, postType, hasInput, shouldDispatch]: CDUTypeTwo) => {
      it(`${shouldIf(
        shouldDispatch
      )} dispatch going from no channel to a channel with allowed post types '${postTypes.toString()}', user input is ${
        hasInput ? "not " : ""
      }empty`, () => {
        const dispatch = helper.sandbox.stub()
        currentChannel.allowed_post_types = postTypes
        const page = new InnerCreatePostPage()
        const url =
          hasInput && postType === LINK_TYPE_LINK ? "http://foo.edu" : ""
        const text = hasInput && postType === LINK_TYPE_TEXT ? "test text" : ""
        // eslint-disable-next-line camelcase
        const article_content =
          hasInput && postType === LINK_TYPE_ARTICLE ? [{ foo: "bar" }] : null
        const props: any = {
          dispatch,
          postForm: {
            value: {
              postType: postType,
              url,
              text,
              article_content
            }
          },
          channel: currentChannel
        }

        page.props = props
        const prevProps = {
          channel: null
        }

        // $FlowFixMe
        page.componentDidUpdate(prevProps)
        if (shouldDispatch) {
          assert.equal(dispatch.callCount, 1)
          assert.deepEqual(dispatch.args[0][0].payload.value, {
            postType:         postType ? null : postTypes[0],
            url:              "",
            text:             "",
            thumbnail:        null,
            article_content:  [],
            show_cover_image: true
          })
        } else {
          assert.equal(dispatch.callCount, 0)
        }
      })
    })
  })
})
