// @flow
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"

import CreatePostForm from "./CreatePostForm"
import Embedly from "./Embedly"

import { LINK_TYPE_LINK, LINK_TYPE_TEXT } from "../lib/channels"
import * as channels from "../lib/channels"
import { makeChannel } from "../factories/channels"
import { makeArticle } from "../factories/embedly"

describe("CreatePostForm", () => {
  let sandbox, isTextTabSelectedStub, isLinkTypeCheckedStub

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    isTextTabSelectedStub = sandbox.stub(channels, "isTextTabSelected")
    isTextTabSelectedStub.returns(true)
    isLinkTypeCheckedStub = sandbox.stub(channels, "isLinkTypeChecked")
    isLinkTypeCheckedStub.returns(true)
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should show an embedly preview when link post and non-error embedly object", () => {
    const errorArticle = makeArticle()
    errorArticle.type = "error"
    ;[
      [LINK_TYPE_LINK, true, makeArticle()],
      [LINK_TYPE_TEXT, false, makeArticle()],
      [LINK_TYPE_LINK, false, errorArticle],
      [LINK_TYPE_LINK, false, undefined],
      [LINK_TYPE_TEXT, false, undefined]
    ].forEach(([postType, shouldShowEmbed, embedlyResponse]) => {
      const form = {
        postType: postType,
        title:    "title"
      }
      const wrapper = shallow(
        <CreatePostForm
          postForm={form}
          embedly={embedlyResponse}
          validation={{}}
          channels={[]}
        />
      )
      assert.equal(shouldShowEmbed, wrapper.find(Embedly).exists())
    })
  })

  it("uses isTextTabSelected to determine which tab to show", () => {
    isTextTabSelectedStub.returns(false)
    const form = {
      postType: LINK_TYPE_LINK,
      title:    "title"
    }
    const channel = makeChannel()
    const wrapper = shallow(
      <CreatePostForm
        postForm={form}
        validation={{}}
        channel={channel}
        channels={new Map([[channel.name, channel]])}
      />
    )
    sinon.assert.calledWith(isTextTabSelectedStub, LINK_TYPE_LINK, channel)
    assert.equal(wrapper.find(".active").text(), "New link post")
  })
  ;[[true, false], [false, true], [true, true]].forEach(
    ([showLink, showText]) => {
      it(`shows ${
        showLink && showText
          ? "both tabs"
          : showText
            ? "the text tab"
            : "the link tab"
      }`, () => {
        isLinkTypeCheckedStub.callsFake(
          (_, linkType) => (linkType === LINK_TYPE_TEXT ? showText : showLink)
        )
        const form = {
          postType: LINK_TYPE_LINK,
          title:    "title"
        }
        const channel = makeChannel()
        const wrapper = shallow(
          <CreatePostForm
            postForm={form}
            validation={{}}
            channel={channel}
            channels={new Map([[channel.name, channel]])}
          />
        )

        assert.equal(wrapper.find(".new-text-post").length, showText ? 1 : 0)
        assert.equal(wrapper.find(".new-link-post").length, showLink ? 1 : 0)
      })
    }
  )
})
