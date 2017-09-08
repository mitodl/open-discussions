// @flow
import React from "react"
import { assert } from "chai"
import { mount } from "enzyme"
import { Link } from "react-router-dom"
import ReactMarkdown from "react-markdown"

import PostDisplay from "./PostDisplay"
import Router from "../Router"

import { wait } from "../lib/util"
import { formatCommentsCount } from "../lib/posts"
import { makePost } from "../factories/posts"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("PostDisplay", () => {
  let helper
  const renderPostDisplay = props => {
    props = {
      toggleUpvote: () => {},
      ...props
    }
    return mount(
      <Router store={helper.store} history={helper.browserHistory}>
        <PostDisplay {...props} />
      </Router>
    )
  }

  beforeEach(() => {
    helper = new IntegrationTestHelper()
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render a post correctly", () => {
    const post = makePost()
    const wrapper = renderPostDisplay({ post })
    const summary = wrapper.find(".summary")
    assert.equal(wrapper.find(".votes").text(), post.score.toString())
    assert.equal(summary.find(Link).at(0).props().children, post.title)
    assert.deepEqual(
      wrapper.find(".num-comments").find(Link).props().children,
      formatCommentsCount(post)
    )
    const authoredBy = wrapper.find(".authored-by").text()
    assert(authoredBy.startsWith(post.author_id))
    assert.isNotEmpty(authoredBy.substring(post.author_id.length))
  })

  it("should link to the subreddit, if told to", () => {
    const post = makePost()
    post.channel_name = "channel_name"
    const wrapper = renderPostDisplay({ post: post, showChannelLink: true })
    assert.equal(wrapper.find(Link).at(1).props().to, "/channel/channel_name")
  })

  it("should display text, if given a text post and the 'expanded' flag", () => {
    const post = makePost()
    let string = "JUST SOME GREAT TEXT!"
    post.text = string
    const wrapper = renderPostDisplay({ post: post, expanded: true })
    assert.equal(wrapper.find(ReactMarkdown).props().source, string)
  })

  it("should display profile image, if expanded", () => {
    const post = makePost()
    const wrapper = renderPostDisplay({ post: post, expanded: true })
    const { src } = wrapper.find(".summary img").props()
    assert.equal(src, post.profile_image)
  })

  it("should not display images from markdown", () => {
    const post = makePost()
    post.text = "# MARKDOWN!\n![](https://images.example.com/potato.jpg)"
    const wrapper = renderPostDisplay({ post: post, expanded: true })
    assert.equal(wrapper.find(ReactMarkdown).props().source, post.text)
    assert.lengthOf(wrapper.find(ReactMarkdown).find("img"), 0)
  })

  it("should not display text, if given a text post but lacking the 'expanded' flag", () => {
    const post = makePost()
    let string = "JUST SOME GREAT TEXT!"
    post.text = string
    const wrapper = renderPostDisplay({ post: post })
    assert.notInclude(wrapper.text(), string)
  })

  it("should include an external link, if a url post", () => {
    let post = makePost(true)
    const wrapper = renderPostDisplay({ post: post })
    const { href, target, children } = wrapper.find("a").at(0).props()
    assert.equal(href, post.url)
    assert.equal(target, "_blank")
    assert.equal(children, post.title)
  })

  it("should link to the detail view, if a text post", () => {
    let post = makePost()
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
      let post = makePost()
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
