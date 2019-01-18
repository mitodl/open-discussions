// @flow
/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import { assert } from "chai"
import { mount } from "enzyme"
import { Link } from "react-router-dom"

import CompactPostDisplay from "./CompactPostDisplay"
import Router from "../Router"
import DropdownMenu from "./DropdownMenu"

import IntegrationTestHelper from "../util/integration_test_helper"
import { wait } from "../lib/util"
import { channelURL, postDetailURL, urlHostname, profileURL } from "../lib/url"
import {
  PostTitleAndHostname,
  getPostDropdownMenuKey,
  POST_PREVIEW_LINES
} from "../lib/posts"
import { makePost } from "../factories/posts"
import { showDropdown } from "../actions/ui"
import * as utilFuncs from "../lib/util"
import { shouldIf } from "../lib/test_utils"
import { LINK_TYPE_TEXT } from "../lib/channels"

describe("CompactPostDisplay", () => {
  let helper, post, openMenu

  const renderPostDisplay = props => {
    props = {
      toggleUpvote:    () => {},
      menuOpen:        false,
      isModerator:     false,
      reportPost:      helper.sandbox.stub(),
      showChannelLink: false,
      showPinUI:       false,
      showPostMenu:    helper.sandbox.stub(),
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

    assert.include(
      wrapper
        .find(".comment-link")
        .at(0)
        .text(),
      `${post.num_comments}`
    )

    const authoredBy = wrapper.find(".authored-by").text()
    assert(authoredBy.startsWith(post.author_name))
    assert.isNotEmpty(authoredBy.substring(post.author_name.length))
  })

  //
  ;[["My headline", true], [null, false]].forEach(
    ([headlineText, expElementExists]) => {
      it(`${shouldIf(
        expElementExists
      )} display headline span when text=${String(headlineText)}`, () => {
        post.author_headline = headlineText
        const wrapper = renderPostDisplay({ post })
        const headlineSpan = wrapper.find(".author-headline")
        assert.equal(headlineSpan.exists(), expElementExists)
        if (expElementExists && headlineText) {
          assert(headlineSpan.text().includes(headlineText))
        }
      })
    }
  )

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
      post_type: LINK_TYPE_TEXT,
      text:      exampleText
    })
    const truncatableText = renderPostDisplay({ post }).find("Dotdotdot")
    assert.equal(truncatableText.prop("clamp"), POST_PREVIEW_LINES)
    assert.equal(truncatableText.prop("children"), exampleText)
  })

  it("should link to the post detail page via post date", () => {
    const wrapper = renderPostDisplay({ post })
    const linkProps = wrapper
      .find(".date")
      .at(0)
      .find(Link)
      .at(0)
      .props()
    assert.equal(
      linkProps.to,
      postDetailURL(post.channel_name, post.id, post.slug)
    )
  })

  it("should link to the subreddit, if told to", () => {
    post.channel_name = "channel_name"
    const wrapper = renderPostDisplay({ post, showChannelLink: true })
    const linkProps = wrapper
      .find(".date")
      .at(0)
      .find(Link)
      .at(1)
      .props()
    assert.equal(linkProps.to, channelURL("channel_name"))
    assert.equal(linkProps.children, post.channel_title)
  })

  it("should include an external link, if a url post", () => {
    const post = makePost(true)
    const wrapper = renderPostDisplay({ post })
    const { href, target } = wrapper
      .find(".external-link a")
      .at(0)
      .props()
    assert.equal(href, post.url)
    assert.equal(target, "_blank")
  })

  it("should include a local image, if an article post with thumbnail", () => {
    post.article_content = [{ a: "b" }]
    post.thumbnail = "/static/media/img.jpg"
    const wrapper = renderPostDisplay({ post })
    const { src } = wrapper.find("img").props()
    assert.equal(src, "/static/media/img.jpg")
  })

  it("should set a class and show icon if stickied and showing pin ui", () => {
    [[true, true], [true, false], [false, true], [false, false]].forEach(
      ([showPinUI, stickied]) => {
        post.stickied = stickied
        const wrapper = renderPostDisplay({ post, showPinUI })
        assert.equal(
          wrapper
            .find(".compact-post-summary")
            .at(0)
            .props().className,
          showPinUI && stickied
            ? "compact-post-summary sticky"
            : "compact-post-summary "
        )
        assert.equal(wrapper.find("img.pin").exists(), showPinUI && stickied)
      }
    )
  })

  it("should display the domain, for a url post", () => {
    const post = makePost(true)
    const wrapper = renderPostDisplay({ post })
    assert.include(wrapper.find(".url-hostname").text(), urlHostname(post.url))
  })

  it("should link to the detail view", () => {
    const detailLink = renderPostDisplay({ post })
      .find(Link)
      .at(0)
    const { to } = detailLink.props()
    assert.equal(to, postDetailURL(post.channel_name, post.id, post.slug))
    assert.ok(detailLink.find(PostTitleAndHostname).exists())
  })

  const assertButton = (wrapper, isUpvote) => {
    if (isUpvote) {
      assert.include(
        wrapper.find(".post-upvote-button").props().className,
        "upvoted"
      )
    } else {
      assert.notInclude(
        wrapper.find(".post-upvote-button").props().className,
        "upvoted"
      )
    }
  }

  //
  ;[true, false].forEach(prevUpvote => {
    it(`should show the correct UI when the upvote
    button is clicked when prev state was ${String(prevUpvote)}`, async () => {
      post.upvoted = prevUpvote
      // setting to a function so Flow doesn't complain
      let resolveUpvote = () => null
      const toggleUpvote = helper.sandbox.stub().returns(
        new Promise(resolve => {
          resolveUpvote = resolve
        })
      )
      const wrapper = renderPostDisplay({
        post,
        toggleUpvote
      })
      assertButton(wrapper, prevUpvote)
      wrapper.find(".post-upvote-button").simulate("click")
      assert.isOk(toggleUpvote.calledOnce)

      assertButton(wrapper, !prevUpvote)
      resolveUpvote()
      post.upvoted = !prevUpvote
      wrapper.setProps({ post })
      // wait for promise resolve to trigger state changes
      await wait(10)
      wrapper.update()
      assertButton(wrapper, !prevUpvote)
    })
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

      wrapper
        .find(DropdownMenu)
        .find("a")
        .at(0)
        .simulate("click")
      assert.ok(togglePinPostStub.calledWith(post))
    })

    it('should include a "pinning" link, if isModerator and showPinUI', () => {
      [[true, "Unpin"], [false, "Pin"]].forEach(([pinned, linkText]) => {
        post.stickied = pinned
        const wrapper = renderPostDisplay({
          post,
          showPinUI:   true,
          isModerator: true,
          menuOpen:    true
        })
        assert.equal(
          linkText,
          wrapper
            .find(DropdownMenu)
            .find("a")
            .at(0)
            .text()
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

    it("should put a remove button, if it gets the right props", () => {
      const removePostStub = helper.sandbox.stub()
      const wrapper = renderPostDisplay({
        post,
        isModerator: true,
        removePost:  removePostStub
      })
      const link = wrapper.find({ children: "Remove" })
      assert(link.exists())
      link.simulate("click")
      assert.ok(removePostStub.calledWith(post))
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
