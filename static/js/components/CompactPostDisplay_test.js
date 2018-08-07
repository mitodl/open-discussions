// @flow
/* global SETTINGS: false */
import React from "react"
import { assert } from "chai"
import { mount } from "enzyme"
import { Link } from "react-router-dom"

import CompactPostDisplay from "./CompactPostDisplay"
import Router from "../Router"
import DropdownMenu from "./DropdownMenu"

import IntegrationTestHelper from "../util/integration_test_helper"
import { truncate, wait } from "../lib/util"
import { channelURL, postDetailURL, urlHostname, profileURL } from "../lib/url"
import { PostTitleAndHostname, getPostDropdownMenuKey } from "../lib/posts"
import { makePost } from "../factories/posts"
import { showDropdown } from "../actions/ui"
import * as utilFuncs from "../lib/util"

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

  it("should not display headline span if author headline is null", () => {
    post.author_headline = null
    const wrapper = renderPostDisplay({ post })
    assert.isNotOk(wrapper.find(".author-headline").exists())
  })

  it("should display headline span with correct text", () => {
    post.author_headline = "My headline"
    const wrapper = renderPostDisplay({ post })
    const headlineSpan = wrapper.find(".author-headline")
    assert(headlineSpan.text().includes("My headline"))
  })

  it("should link to the author's profile", () => {
    const link = renderPostDisplay({ post })
      .find(".authored-by")
      .find("Link")
    assert.equal(link.text(), post.author_name)
    assert.equal(link.props().to, profileURL(post.author_id))
  })

  it("should link to the subreddit, if told to", () => {
    post.channel_name = "channel_name"
    const wrapper = renderPostDisplay({ post, showChannelLink: true })
    const linkProps = wrapper
      .find(".date")
      .find(Link)
      .props()
    assert.equal(linkProps.to, channelURL("channel_name"))
    assert.equal(linkProps.children, post.channel_title)
  })

  it("should include an external link, if a url post", () => {
    const post = makePost(true)
    const wrapper = renderPostDisplay({ post })
    const { href, target } = wrapper
      .find("a")
      .at(2)
      .props()
    assert.equal(href, post.url)
    assert.equal(target, "_blank")
  })

  it("should set a class if stickied and showing pin ui", () => {
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

  const assertButton = (wrapper, isUpvote, isVoting) => {
    assert.equal(wrapper.find(".upvote-button").props().disabled, isVoting)
    if (isUpvote) {
      assert.include(wrapper.find(".upvotes").props().className, "upvoted")
      assert.equal(
        wrapper.find(".upvotes img").props().src,
        "/static/images/upvote_arrow_on.png"
      )
    } else {
      assert.notInclude(wrapper.find(".upvotes").props().className, "upvoted")
      assert.equal(
        wrapper.find(".upvotes img").props().src,
        "/static/images/upvote_arrow.png"
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
      assertButton(wrapper, prevUpvote, false)
      wrapper.find(".upvote-button").simulate("click")
      assert.isOk(toggleUpvote.calledOnce)

      assertButton(wrapper, !prevUpvote, true)
      resolveUpvote()
      post.upvoted = !prevUpvote
      wrapper.setProps({ post })
      // wait for promise resolve to trigger state changes
      await wait(10)
      wrapper.update()
      assertButton(wrapper, !prevUpvote, false)
    })
  })

  describe("Dropdown menu tests", () => {
    beforeEach(() => {
      openMenu()
    })

    it("should show a report link", () => {
      const reportPost = helper.sandbox.stub()
      const wrapper = renderPostDisplay({ post, reportPost })
      const link = wrapper.find({ children: "report" })
      link.props().onClick()
      assert.ok(reportPost.called)
    })

    it("should hide the report link for anon users", () => {
      SETTINGS.username = null
      const wrapper = renderPostDisplay({ post })
      const link = wrapper.find({ children: "report" })
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
      [[true, "unpin"], [false, "pin"]].forEach(([pinned, linkText]) => {
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
      assert.equal(count.text(), `Reports: ${post.num_reports}`)
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
      const link = wrapper.find({ children: "remove" })
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
      const link = wrapper.find({ children: "ignore all reports" })
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

  it("should hide the menu open button when anonymous", () => {
    helper.sandbox.stub(utilFuncs, "userIsAnonymous").returns(true)
    const wrapper = renderPostDisplay({ post })
    assert.isNotOk(wrapper.find("i.more_vert").exists())
  })
})
