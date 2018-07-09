import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"

import CreatePostForm from "./CreatePostForm"
import Embedly, { EmbedlyLoader } from "./Embedly"

import { LINK_TYPE_LINK, LINK_TYPE_TEXT } from "../lib/channels"
import * as channels from "../lib/channels"
import { makeChannel } from "../factories/channels"
import { makeArticle } from "../factories/embedly"
import { newPostForm } from "../lib/posts"

describe("CreatePostForm", () => {
  let sandbox, isTextTabSelectedStub, isLinkTypeAllowedStub

  const renderPostForm = (props = {}) =>
    shallow(
      <CreatePostForm
        validation={{}}
        channels={[]}
        postForm={newPostForm()}
        {...props}
      />
    )

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    isTextTabSelectedStub = sandbox.stub(channels, "isTextTabSelected")
    isTextTabSelectedStub.returns(true)
    isLinkTypeAllowedStub = sandbox.stub(channels, "isLinkTypeAllowed")
    isLinkTypeAllowedStub.returns(true)
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
    const postForm = { url: "some url", postType: LINK_TYPE_LINK }

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
          text:     ""
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
