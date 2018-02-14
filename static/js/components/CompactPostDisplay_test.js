// @flow
import React from "react"
import { assert } from "chai"
import { mount } from "enzyme"
import { Link } from "react-router-dom"

import CompactPostDisplay from "./CompactPostDisplay"
import Router from "../Router"

import { wait } from "../lib/util"
import { urlHostname } from "../lib/url"
import { formatCommentsCount } from "../lib/posts"
import { makePost } from "../factories/posts"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("CompactPostDisplay", () => {
  let helper, post

  const renderPostDisplay = props => {
    props = {
      toggleUpvote: () => {},
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
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render a post correctly", () => {
    const wrapper = renderPostDisplay({ post })
    const summary = wrapper.find(".summary")
    assert.equal(wrapper.find(".votes").text(), post.score.toString())
    assert.equal(summary.find(Link).at(0).props().children, post.title)
    assert.deepEqual(
      wrapper.find(".post-links").find(Link).props().children,
      formatCommentsCount(post)
    )
    const authoredBy = wrapper.find(".authored-by").text()
    assert(authoredBy.startsWith(`by ${post.author_name}`))
    assert.isNotEmpty(authoredBy.substring(post.author_name.length))
    const img = wrapper.find(".profile-image")
    assert.ok(img.exists())
    const { src } = img.props()
    assert.equal(src, post.profile_image)
  })

  it("should link to the subreddit, if told to", () => {
    post.channel_name = "channel_name"
    const wrapper = renderPostDisplay({ post, showChannelLink: true })
    const linkProps = wrapper.find(Link).at(1).props()
    assert.equal(linkProps.to, "/channel/channel_name")
    assert.equal(linkProps.children, post.channel_title)
  })

  it("should include an external link, if a url post", () => {
    const post = makePost(true)
    const wrapper = renderPostDisplay({ post })
    const { href, target, children } = wrapper.find("a").at(0).props()
    assert.equal(href, post.url)
    assert.equal(target, "_blank")
    assert.equal(children, post.title)
  })

  it('should include a "pinning" link, if isModerator and showPinUI', () => {
    [[true, "unpin"], [false, "pin"]].forEach(([pinned, linkText]) => {
      const post = makePost()
      post.stickied = pinned
      const wrapper = renderPostDisplay({
        post,
        showPinUI:   true,
        isModerator: true
      })
      assert.equal(linkText, wrapper.find("a").at(2).text())
    })
  })

  it("should not show a pin link otherwise", () => {
    [true, false].forEach(showPinUI => {
      const wrapper = renderPostDisplay({ post, showPinUI })
      assert.lengthOf(wrapper.find(".post-links").find("a"), 1)
    })
  })

  it("should set a class if stickied and showing pin ui", () => {
    [
      [true, true],
      [true, false],
      [false, true],
      [false, false]
    ].forEach(([showPinUI, stickied]) => {
      post.stickied = stickied
      const wrapper = renderPostDisplay({ post, showPinUI })
      assert.equal(
        wrapper.find(".post-summary").props().className,
        showPinUI && stickied ? "post-summary sticky" : "post-summary "
      )
    })
  })

  it("pin link should call togglePinPost", () => {
    const togglePinPostStub = helper.sandbox.stub()
    const post = makePost()
    post.stickied = true
    const wrapper = renderPostDisplay({
      post,
      showPinUI:     true,
      isModerator:   true,
      togglePinPost: togglePinPostStub
    })
    wrapper.find("a").at(2).simulate("click")
    assert.ok(togglePinPostStub.calledWith(post))
  })

  it("should display the domain, for a url post", () => {
    const post = makePost(true)
    const wrapper = renderPostDisplay({ post })
    assert.include(wrapper.find(".url-hostname").text(), urlHostname(post.url))
  })

  it("should link to the detail view, if a text post", () => {
    const wrapper = renderPostDisplay({ post })
    const { to, children } = wrapper.find(Link).at(0).props()
    assert.equal(children, post.title)
    assert.equal(to, `/channel/${post.channel_name}/${post.id}`)
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
      assertButton(wrapper, !prevUpvote, false)
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
    const link = wrapper.find("a").at(2)
    assert.equal(link.text(), "remove")
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
    const link = wrapper.find("a").at(2)
    assert.equal(link.text(), "ignore all reports")
    link.simulate("click")
    assert.ok(ignorePostStub.calledWith(post))
  })
})
