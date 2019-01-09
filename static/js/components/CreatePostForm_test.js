/* global SETTINGS: false */
// @flow
import { assert } from "chai"
import sinon from "sinon"

import CreatePostForm from "./CreatePostForm"
import Embedly, { EmbedlyLoader } from "./Embedly"

import {
  LINK_TYPE_LINK,
  LINK_TYPE_TEXT,
  LINK_TYPE_ARTICLE
} from "../lib/channels"
import * as channels from "../lib/channels"
import { makeChannel } from "../factories/channels"
import { makeArticle } from "../factories/embedly"
import { newPostForm } from "../lib/posts"
import { configureShallowRenderer } from "../lib/test_utils"
import { shouldIf, makeEvent } from "../lib/test_utils"
import * as postLib from "../lib/posts"

describe("CreatePostForm", () => {
  let sandbox,
    isLinkTypeAllowedStub,
    renderPostForm,
    openClearPostTypeDialogStub,
    updatePostTypeStub,
    setPhotoErrorStub,
    onUpdateStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    isLinkTypeAllowedStub = sandbox.stub(channels, "isLinkTypeAllowed")
    isLinkTypeAllowedStub.returns(true)
    openClearPostTypeDialogStub = sandbox.stub()
    updatePostTypeStub = sandbox.stub()
    setPhotoErrorStub = sandbox.stub()
    onUpdateStub = sandbox.stub()
    renderPostForm = configureShallowRenderer(CreatePostForm, {
      validation:              {},
      channels:                new Map(),
      channel:                 makeChannel(),
      postForm:                newPostForm(),
      embedlyInFlight:         false,
      embedly:                 {},
      history:                 {},
      onSubmit:                sandbox.stub(),
      onUpdate:                onUpdateStub,
      updatePostType:          updatePostTypeStub,
      processing:              false,
      updateChannelSelection:  sandbox.stub(),
      openClearPostTypeDialog: openClearPostTypeDialogStub,
      setPhotoError:           setPhotoErrorStub
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
    ["share-a-link", [LINK_TYPE_TEXT, LINK_TYPE_ARTICLE]],
    ["write-something", [LINK_TYPE_LINK, LINK_TYPE_ARTICLE]],
    ["write-an-article", [LINK_TYPE_TEXT, LINK_TYPE_TEXT]]
  ].forEach(([selector, postTypes]) => {
    it(`should hide the ${selector} button when it is not in the allowed_post_types`, () => {
      const channel = makeChannel()
      channel.allowed_post_types = postTypes
      const postForm = { ...newPostForm() }
      const wrapper = renderPostForm({
        postForm,
        channel
      })
      assert.isFalse(wrapper.find(selector).exists())
    })
  })

  it("should show article validation message", () => {
    const postForm = { ...newPostForm(), postType: LINK_TYPE_ARTICLE }
    const wrapper = renderPostForm({
      validation: { article: "WHAT?! NO! OF COURSE NOT!" },
      postForm
    })
    assert.equal(
      wrapper.find(".article .validation-message").text(),
      "WHAT?! NO! OF COURSE NOT!"
    )
  })

  it("should show a cover image input if the user is editing an article", () => {
    const postForm = { ...newPostForm(), postType: LINK_TYPE_ARTICLE }
    const wrapper = renderPostForm({
      postForm
    })
    const input = wrapper.find("CoverImageInput")
    assert.ok(input.exists())
    const { setPhotoError, onUpdate } = input.props()
    assert.equal(onUpdate, onUpdateStub)
    assert.equal(setPhotoError, setPhotoErrorStub)
  })

  it("should pass down a coverImage, if there is one in the form", () => {
    const coverImage = new File([], "foobar.jpg")
    const postForm = {
      ...newPostForm(),
      postType:    LINK_TYPE_ARTICLE,
      cover_image: coverImage
    }
    const wrapper = renderPostForm({
      postForm
    })
    const { image } = wrapper.find("CoverImageInput").props()
    assert.equal(image, coverImage)
  })

  //
  ;[
    [[LINK_TYPE_TEXT, LINK_TYPE_LINK, LINK_TYPE_ARTICLE], LINK_TYPE_LINK, true],
    [[LINK_TYPE_TEXT, LINK_TYPE_LINK, LINK_TYPE_ARTICLE], LINK_TYPE_TEXT, true],
    [[LINK_TYPE_LINK, LINK_TYPE_ARTICLE], LINK_TYPE_LINK, true],
    [[LINK_TYPE_TEXT, LINK_TYPE_ARTICLE], LINK_TYPE_TEXT, true],
    [[LINK_TYPE_TEXT], LINK_TYPE_TEXT, false],
    [[LINK_TYPE_LINK], LINK_TYPE_LINK, false],
    [[LINK_TYPE_ARTICLE], LINK_TYPE_ARTICLE, false]
  ].forEach(([allowedTypes, selectedType, showClosebutton]) => {
    it(`${shouldIf(
      showClosebutton
    )} show clear button when channel ${allowedTypes.toString()} and form has ${selectedType}`, () => {
      const postForm = { ...newPostForm(), postType: selectedType }
      const channel = makeChannel()
      channel.allowed_post_types = allowedTypes
      const wrapper = renderPostForm({ postForm, channel })
      assert.equal(wrapper.find("CloseButton").exists(), showClosebutton)
    })
  })

  //
  ;[LINK_TYPE_LINK, LINK_TYPE_TEXT, LINK_TYPE_ARTICLE].forEach(linkType => {
    it(`should show close button when channel is not present and ${linkType} is selected`, () => {
      const postForm = { ...newPostForm(), postType: linkType }
      const wrapper = renderPostForm({ channel: undefined, postForm })
      assert.isOk(wrapper.find("CloseButton").exists())
    })
  })

  //
  ;[true, false].forEach(formIsEmpty => {
    it(`${
      formIsEmpty ? "clears form" : "opens confirm dialog"
    } when clear button clicked if form is ${
      formIsEmpty ? "empty" : "not empty"
    }`, () => {
      const emptyStub = sandbox.stub(postLib, "postFormIsContentless")
      emptyStub.returns(formIsEmpty)
      const postForm = { ...newPostForm(), postType: LINK_TYPE_LINK }
      const wrapper = renderPostForm({ postForm })
      wrapper.find("CloseButton").simulate("click", makeEvent("foo", "bar"))

      if (formIsEmpty) {
        sinon.assert.calledWith(updatePostTypeStub, null)
      } else {
        sinon.assert.calledOnce(openClearPostTypeDialogStub)
      }
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

  //
  ;[true, false].forEach(uiEnabled => {
    it(`${shouldIf(uiEnabled)} show the article button when flag is ${String(
      uiEnabled
    )}`, () => {
      SETTINGS.article_ui_enabled = uiEnabled
      const wrapper = renderPostForm()
      assert.equal(uiEnabled, wrapper.find(".write-an-article").exists())
    })
  })
})
