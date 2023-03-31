// @flow
/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import sinon from "sinon"
import { assert } from "chai"
import { mount } from "enzyme"
import { Link } from "react-router-dom"

import CompactPostDisplay from "./CompactPostDisplay"
import Router from "../Router"
import DropdownMenu from "./DropdownMenu"

import IntegrationTestHelper from "../util/integration_test_helper"
import { channelURL, postDetailURL, urlHostname, profileURL } from "../lib/url"
import {
  PostTitleAndHostname,
  getPostDropdownMenuKey,
  POST_PREVIEW_LINES,
  EMBEDLY_THUMB_WIDTH,
  EMBEDLY_THUMB_HEIGHT
} from "../lib/posts"
import * as postLib from "../lib/posts"
import { makePost } from "../factories/posts"
import { showDropdown } from "../actions/ui"
import * as utilFuncs from "../lib/util"
import { shouldIf } from "../lib/test_utils"
import {
  LINK_TYPE_ARTICLE,
  LINK_TYPE_LINK,
  LINK_TYPE_TEXT
} from "../lib/channels"
import * as urlLib from "../lib/url"
import { mockHTMLElHeight } from "../lib/test_utils"

describe("CompactPostDisplay", () => {
  let helper, post, openMenu

  const renderPostDisplay = props => {
    props = {
      menuOpen:        false,
      isModerator:     false,
      reportPost:      helper.sandbox.stub(),
      showChannelLink: false,
      showPinUI:       false,
      togglePinPost:   helper.sandbox.stub(),
      ...props
    }
    return mount(
      <Router store={helper.store} history={helper.browserHistory}>
        <CompactPostDisplay {...props} />
      </Router>
    )
  }

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    post = makePost()
    openMenu = () =>
      helper.store.dispatch(showDropdown(getPostDropdownMenuKey(post)))
    mockHTMLElHeight(100, 50)
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render a post correctly", () => {
    const wrapper = renderPostDisplay({ post })
    assert.equal(wrapper.find(".votes").text(), post.score.toString())

    const titleDisplay = wrapper.find(PostTitleAndHostname)
    assert.ok(titleDisplay.exists())
    assert.deepEqual(titleDisplay.props().post, post)

    const commentHref = wrapper.find(".comment-link")
    assert.ok(commentHref.exists())

    const authoredBy = wrapper.find(".authored-by").text()
    assert(authoredBy.startsWith(post.author_name))
    assert.isNotEmpty(authoredBy.substring(post.author_name.length))
  })

  //
  ;[
    ["My headline", true],
    [null, false]
  ].forEach(([headlineText, expElementExists]) => {
    it(`${shouldIf(expElementExists)} display headline span when text=${String(
      headlineText
    )}`, () => {
      post.author_headline = headlineText
      const wrapper = renderPostDisplay({ post })
      const headlineSpan = wrapper.find(".author-headline")
      assert.equal(headlineSpan.exists(), expElementExists)
      if (expElementExists && headlineText) {
        assert(headlineSpan.text().includes(headlineText))
      }
    })
  })

  it("should link to the author's profile", () => {
    const link = renderPostDisplay({ post })
      .find(".authored-by")
      .find("Link")
      .at(0)
    assert.equal(link.text(), post.author_name)
    assert.equal(link.props().to, profileURL(post.author_id))
  })

  it("should show preview text", () => {
    const exampleText = "lorem ipsum"
    post = R.merge(post, {
      post_type:  LINK_TYPE_TEXT,
      plain_text: exampleText
    })
    const truncatableText = renderPostDisplay({ post }).find("TruncatedText")
    assert.deepEqual(truncatableText.props(), {
      text:            exampleText,
      lines:           POST_PREVIEW_LINES,
      estCharsPerLine: 130,
      className:       "preview"
    })
  })

  it("should link to the post detail page via post date", () => {
    const wrapper = renderPostDisplay({ post })
    const linkProps = wrapper.find(".date").at(0).find(Link).at(0).props()
    assert.equal(
      linkProps.to,
      postDetailURL(post.channel_name, post.id, post.slug)
    )
  })

  it("should link to the subreddit, if told to", () => {
    post.channel_name = "channel_name"
    const wrapper = renderPostDisplay({ post, showChannelLink: true })
    const linkProps = wrapper.find(".date").at(0).find(Link).at(1).props()
    assert.equal(linkProps.to, channelURL("channel_name"))
    assert.equal(linkProps.children, post.channel_title)
  })

  it("should include an external link, if a url post", () => {
    post = makePost(true)
    const wrapper = renderPostDisplay({ post })
    const { href, target } = wrapper.find(".external-link a").at(0).props()
    assert.equal(href, post.url)
    assert.equal(target, "_blank")
  })

  describe("thumbnail image", () => {
    let embedlyImgStub, embedlyUrl, getThumbnailSrcStub

    beforeEach(() => {
      embedlyUrl = "https://i.embed.ly/img.jpg"
      embedlyImgStub = helper.sandbox
        .stub(urlLib, "embedlyThumbnail")
        .returns(embedlyUrl)
      getThumbnailSrcStub = helper.sandbox.stub(postLib, "getThumbnailSrc")
    })
    ;[
      [LINK_TYPE_LINK, "img.jpg", true],
      [LINK_TYPE_LINK, null, false],
      [LINK_TYPE_ARTICLE, "img.jpg", true],
      [LINK_TYPE_ARTICLE, null, false]
    ].forEach(([postType, thumbnailSrc, expImg]) => {
      it(`${shouldIf(expImg)} be shown if thumbnail src=${String(
        thumbnailSrc
      )}`, () => {
        const embedlyKeyVal = "abcdefg"
        SETTINGS.embedlyKey = embedlyKeyVal
        getThumbnailSrcStub.returns(thumbnailSrc)

        post = makePost(postType === LINK_TYPE_LINK)
        const wrapper = renderPostDisplay({ post })
        const thumbnail = wrapper.find(".link-thumbnail img")

        assert.equal(thumbnail.exists(), expImg)
        if (expImg) {
          assert.equal(thumbnail.prop("src"), embedlyUrl)
          sinon.assert.calledWith(
            embedlyImgStub,
            embedlyKeyVal,
            thumbnailSrc,
            EMBEDLY_THUMB_HEIGHT,
            EMBEDLY_THUMB_WIDTH
          )
        }
      })
    })
  })

  it("should set a class and show icon if stickied and showing pin ui", () => {
    [
      [true, true],
      [true, false],
      [false, true],
      [false, false]
    ].forEach(([showPinUI, stickied]) => {
      post.stickied = stickied
      const wrapper = renderPostDisplay({ post, showPinUI })
      assert.equal(
        wrapper.find(".compact-post-summary").at(0).props().className,
        showPinUI && stickied
          ? "compact-post-summary sticky"
          : "compact-post-summary "
      )
      assert.equal(wrapper.find("img.pin").exists(), showPinUI && stickied)
    })
  })

  it("should display the domain, for a url post", () => {
    const post = makePost(true)
    const wrapper = renderPostDisplay({ post })
    assert.include(wrapper.find(".url-hostname").text(), urlHostname(post.url))
  })

  it("should link to the detail view", () => {
    const detailLink = renderPostDisplay({ post }).find(Link).at(0)
    const { to } = detailLink.props()
    assert.equal(to, postDetailURL(post.channel_name, post.id, post.slug))
    assert.ok(detailLink.find(PostTitleAndHostname).exists())
  })

  describe("Dropdown menu tests", () => {
    beforeEach(() => {
      openMenu()
    })

    it("should show a report link", () => {
      const reportPost = helper.sandbox.stub()
      const wrapper = renderPostDisplay({ post, reportPost })
      const link = wrapper.find({ children: "Report" })
      link.props().onClick()
      assert.ok(reportPost.called)
    })

    it("should hide the report link for anon users", () => {
      SETTINGS.username = null
      const wrapper = renderPostDisplay({ post })
      const link = wrapper.find({ children: "Report" })
      assert.isNotOk(link.exists())
    })

    it("should not show a pin link otherwise", () => {
      [true, false].forEach(showPinUI => {
        const wrapper = renderPostDisplay({ post, showPinUI })
        assert.lengthOf(wrapper.find(DropdownMenu).find("a"), 1)
      })
    })

    it("pin link should call togglePinPost", () => {
      const togglePinPostStub = helper.sandbox.stub()
      post.stickied = true
      const wrapper = renderPostDisplay({
        post,
        showPinUI:     true,
        isModerator:   true,
        togglePinPost: togglePinPostStub
      })

      wrapper.find(DropdownMenu).find("a").at(0).simulate("click")
      assert.ok(togglePinPostStub.calledWith(post))
    })

    it('should include a "pinning" link, if isModerator and showPinUI', () => {
      [
        [true, "Unpin"],
        [false, "Pin"]
      ].forEach(([pinned, linkText]) => {
        post.stickied = pinned
        const wrapper = renderPostDisplay({
          post,
          showPinUI:   true,
          isModerator: true,
          menuOpen:    true
        })
        assert.equal(
          linkText,
          wrapper.find(DropdownMenu).find("a").at(0).text()
        )
      })
    })

    it("should render a report count, if post is reported", () => {
      post.num_reports = 2
      const wrapper = renderPostDisplay({ post })
      const count = wrapper.find(".report-count")
      assert.ok(count.exists())
      // $FlowFixMe: thinks this doesn't exist
      assert.equal(count.text(), `${post.num_reports} Reports`)
    })

    it("should not render a report count, if post has no report data", () => {
      const wrapper = renderPostDisplay({ post })
      const count = wrapper.find(".report-count")
      assert.isNotOk(count.exists())
    })

    //
    ;[true, false].forEach(userIsAuthor => {
      it(`${shouldIf(
        !userIsAuthor
      )} put a remove button, if it gets the right props and user ${
        userIsAuthor ? "is" : "is not"
      } author`, () => {
        const removePostStub = helper.sandbox.stub()
        if (userIsAuthor) {
          // $FlowFixMe: go home flow, you're drunk
          post.author_id = SETTINGS.username
        }
        const wrapper = renderPostDisplay({
          post,
          isModerator: true,
          removePost:  removePostStub
        })
        const link = wrapper.find({ children: "Remove" })
        assert.equal(link.exists(), !userIsAuthor)
        if (!userIsAuthor) {
          link.simulate("click")
          assert.ok(removePostStub.calledWith(post))
        }
      })
    })

    //
    ;[
      [true, true],
      [true, false],
      [false, true],
      [false, false]
    ].forEach(([userIsAuthor, passDeleteFunc]) => {
      it(`${shouldIf(
        userIsAuthor && passDeleteFunc
      )} put a delete button, if it ${
        passDeleteFunc ? "gets" : "doesn't get"
      } the prop and user ${userIsAuthor ? "is" : "is not"} author`, () => {
        const deletePostStub = helper.sandbox.stub()
        if (userIsAuthor) {
          // $FlowFixMe: go home flow, you're drunk
          post.author_id = SETTINGS.username
        }
        const wrapper = renderPostDisplay({
          post,
          deletePost: passDeleteFunc ? deletePostStub : null
        })
        const link = wrapper.find({ children: "Delete" })
        assert.equal(link.exists(), userIsAuthor && passDeleteFunc)
        if (userIsAuthor && passDeleteFunc) {
          link.simulate("click")
          assert.ok(deletePostStub.calledWith(post))
        }
      })
    })

    it("should put an ignore button, if it gets the right props", () => {
      const ignorePostStub = helper.sandbox.stub()
      const wrapper = renderPostDisplay({
        post,
        isModerator:       true,
        ignorePostReports: ignorePostStub
      })
      const link = wrapper.find({ children: "Ignore reports" })
      assert(link.exists())
      link.simulate("click")
      assert.ok(ignorePostStub.calledWith(post))
    })
  })

  it("should include a button to open the menu", () => {
    const wrapper = renderPostDisplay({ post })
    const openMenuButton = wrapper.find("i.more_vert")

    assert.ok(openMenuButton.exists())
    openMenuButton.simulate("click")
    assert.ok(
      helper.store.getState().ui.dropdownMenus.has(getPostDropdownMenuKey(post))
    )
  })

  //
  ;[true, false].forEach(isAnonymous => {
    [true, false].forEach(useSearchPageUI => {
      it(`${shouldIf(
        isAnonymous || useSearchPageUI
      )} hide the menu open button`, () => {
        helper.sandbox.stub(utilFuncs, "userIsAnonymous").returns(isAnonymous)
        const wrapper = renderPostDisplay({ post, useSearchPageUI })
        assert.equal(
          wrapper.find("i.more_vert").exists(),
          !isAnonymous && !useSearchPageUI
        )
      })
    })
  })
})
