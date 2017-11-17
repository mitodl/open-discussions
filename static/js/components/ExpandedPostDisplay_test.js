// @flow
import React from "react"
import { assert } from "chai"
import { mount } from "enzyme"
import { Link } from "react-router-dom"
import ReactMarkdown from "react-markdown"

import ExpandedPostDisplay from "./ExpandedPostDisplay"
import Router from "../Router"

import { wait } from "../lib/util"
import { urlHostname } from "../lib/url"
import { makePost } from "../factories/posts"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("ExpandedPostDisplay", () => {
  let helper, post

  const renderPostDisplay = props => {
    props = {
      toggleUpvote: () => {},
      ...props
    }
    return mount(
      <Router store={helper.store} history={helper.browserHistory}>
        <ExpandedPostDisplay {...props} />
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
    post.edited = false
    const wrapper = renderPostDisplay({ post })
    const summary = wrapper.find(".summary")
    assert.equal(wrapper.find(".votes").text(), post.score.toString())
    assert.equal(summary.find(Link).at(0).props().children, post.title)
    const authoredBy = wrapper.find(".authored-by").text()
    assert(authoredBy.startsWith(`by ${post.author_name}`))
    assert.isNotEmpty(authoredBy.substring(post.author_name.length))
  })

  it("should display post text", () => {
    const string = "JUST SOME GREAT TEXT!"
    post.text = string
    post.edited = false
    const wrapper = renderPostDisplay({ post: post })
    assert.equal(wrapper.find(ReactMarkdown).props().source, string)
  })

  it("should display profile image", () => {
    const wrapper = renderPostDisplay({ post: post })
    const { src } = wrapper.find(".summary img").props()
    assert.equal(src, post.profile_image)
  })

  it("should not display images from markdown", () => {
    post.edited = false
    post.text = "# MARKDOWN!\n![](https://images.example.com/potato.jpg)"
    const wrapper = renderPostDisplay({ post: post })
    assert.equal(wrapper.find(ReactMarkdown).props().source, post.text)
    assert.lengthOf(wrapper.find(ReactMarkdown).find("img"), 0)
  })

  it("should include an external link, if a url post", () => {
    const post = makePost(true)
    const wrapper = renderPostDisplay({ post: post })
    const { href, target, children } = wrapper.find("a").at(0).props()
    assert.equal(href, post.url)
    assert.equal(target, "_blank")
    assert.equal(children, post.title)
  })

  it("should display the domain, for a url post", () => {
    const post = makePost(true)
    const wrapper = renderPostDisplay({ post: post })
    assert.include(wrapper.find(".url-hostname").text(), urlHostname(post.url))
  })

  it("should link to the detail view, if a text post", () => {
    const wrapper = renderPostDisplay({ post: post })
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
        post:         post,
        toggleUpvote: toggleUpvote
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
})
