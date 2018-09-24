// @flow
import { assert } from "chai"
import sinon from "sinon"

import CreatePostForm from "./CreatePostForm"
import Embedly, { EmbedlyLoader } from "./Embedly"

import { LINK_TYPE_LINK, LINK_TYPE_TEXT, LINK_TYPE_ANY } from "../lib/channels"
import * as channels from "../lib/channels"
import { makeChannel } from "../factories/channels"
import { makeArticle } from "../factories/embedly"
import { newPostForm } from "../lib/posts"
import { configureShallowRenderer } from "../lib/test_utils"
import { shouldIf } from "../lib/test_utils"

describe("CreatePostForm", () => {
  let sandbox, isTextTabSelectedStub, isLinkTypeAllowedStub, renderPostForm

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    isTextTabSelectedStub = sandbox.stub(channels, "isTextTabSelected")
    isTextTabSelectedStub.returns(true)
    isLinkTypeAllowedStub = sandbox.stub(channels, "isLinkTypeAllowed")
    isLinkTypeAllowedStub.returns(true)
    renderPostForm = configureShallowRenderer(CreatePostForm, {
      validation:             {},
      channels:               new Map(),
      channel:                makeChannel(),
      postForm:               newPostForm(),
      embedlyInFlight:        false,
      embedly:                {},
      history:                {},
      onSubmit:               sandbox.stub(),
      nUpdate:                sandbox.stub(),
      updatePostType:         sandbox.stub(),
      processing:             false,
      updateChannelSelection: sandbox.stub()
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should show post_type validation message", () => {
    const wrapper = renderPostForm({
      validation: { post_type: "HEY" }
    })
    assert.equal(
      wrapper.find(".post-type-row .validation-message").text(),
      "HEY"
    )
  })

  it("should show title validation message", () => {
    const wrapper = renderPostForm({
      validation: { title: "HEY" }
    })
    assert.equal(wrapper.find(".titlefield .validation-message").text(), "HEY")
  })

  it("should show text validation message", () => {
    const postForm = { ...newPostForm(), postType: LINK_TYPE_TEXT }
    const wrapper = renderPostForm({
      validation: { text: "HEY" },
      postForm
    })
    assert.equal(wrapper.find(".text .validation-message").text(), "HEY")
  })

  //
  ;[
    [LINK_TYPE_ANY, LINK_TYPE_LINK, true],
    [LINK_TYPE_ANY, LINK_TYPE_TEXT, true],
    [LINK_TYPE_TEXT, LINK_TYPE_TEXT, false],
    [LINK_TYPE_LINK, LINK_TYPE_LINK, false]
  ].forEach(([channelType, selectedType, showClosebutton]) => {
    it(`${
      showClosebutton ? "should" : "should not"
    } show clear button when channel ${channelType} and form has ${selectedType}`, () => {
      const postForm = { ...newPostForm(), postType: selectedType }
      const channel = makeChannel()
      channel.link_type = channelType
      const wrapper = renderPostForm({ postForm, channel })
      assert.equal(wrapper.find("CloseButton").exists(), showClosebutton)
    })
  })

  //
  ;[LINK_TYPE_LINK, LINK_TYPE_TEXT].forEach(linkType => {
    it(`should show close button when channel is not present and ${linkType} is selected`, () => {
      const postForm = { ...newPostForm(), postType: linkType }
      const wrapper = renderPostForm({ channel: undefined, postForm })
      assert.isOk(wrapper.find("CloseButton").exists())
    })
  })

  it("should show url validation message", () => {
    const postForm = { ...newPostForm(), postType: LINK_TYPE_LINK }
    const wrapper = renderPostForm({
      validation: { url: "HEY" },
      postForm
    })
    assert.equal(wrapper.find(".url .validation-message").text(), "HEY")
  })

  it("should show channel validation message", () => {
    const wrapper = renderPostForm({
      validation: { channel: "HEY" }
    })
    assert.equal(
      wrapper.find(".channel-select .validation-message").text(),
      "HEY"
    )
  })

  //
  ;[
    ["", null, true],
    ["", LINK_TYPE_LINK, true],
    ["", LINK_TYPE_TEXT, true],
    ["title", null, true],
    ["title", LINK_TYPE_LINK, false],
    ["title", LINK_TYPE_TEXT, false]
  ].forEach(([title, type, shouldDisable]) => {
    it(`${shouldIf(
      shouldDisable
    )} put .disabled on submit button when title is ${title} and post type is ${String(
      type
    )}`, () => {
      const postForm = { ...newPostForm(), postType: type, title }
      const wrapper = renderPostForm({
        postForm
      })
      assert.equal(
        shouldDisable,
        wrapper
          .find(".submit-post")
          .props()
          .className.includes("disabled")
      )
    })
  })

  describe("embedly preview link", () => {
    const postForm = {
      url:      "some url",
      postType: LINK_TYPE_LINK,
      title:    "",
      text:     ""
    }

    it("should show embedly when a non-error response has arrived", () => {
      const article = makeArticle()
      const error = makeArticle()
      error.type = "error"
      ;[[article, true], [error, false]].forEach(
        ([embedly, shouldRenderComponent]) => {
          const wrapper = renderPostForm({
            postForm,
            embedly
          })
          if (shouldRenderComponent) {
            assert.ok(wrapper.find(Embedly).exists())
          } else {
            // $FlowFixMe
            assert.ok(wrapper.find("input", { name: "url" }).exists())
          }
        }
      )
    })

    it("should show EmbedlyLoader when no embedly and embedlyInFlight", () => {
      const article = makeArticle()
      ;[
        [article, true, false],
        [article, false, false],
        [undefined, true, true],
        [undefined, false, false]
      ].forEach(([embedly, embedlyInFlight, shouldRenderComponent]) => {
        const wrapper = renderPostForm({
          postForm,
          embedly,
          embedlyInFlight
        })
        assert.equal(
          wrapper.find(EmbedlyLoader).exists(),
          shouldRenderComponent
        )
      })
    })
  })

  //
  ;[[true, false], [false, true], [true, true]].forEach(
    ([showLink, showText]) => {
      it(`shows ${
        showLink && showText
          ? "both buttons"
          : showText
            ? "the text button"
            : "the link button"
      }`, () => {
        isLinkTypeAllowedStub.callsFake(
          (_, linkType) => (linkType === LINK_TYPE_TEXT ? showText : showLink)
        )
        const form = {
          postType: null,
          title:    "",
          text:     "",
          url:      ""
        }
        const channel = makeChannel()
        const wrapper = renderPostForm({
          channel,
          postForm:        form,
          channels:        new Map([[channel.name, channel]]),
          embedlyInFlight: false,
          embedly:         {}
        })

        assert.equal(wrapper.find(".write-something").length, showText ? 1 : 0)
        assert.equal(wrapper.find(".share-a-link").length, showLink ? 1 : 0)
      })
    }
  )
})
