import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import sinon from "sinon"

import PostList from "./PostList"
import CompactPostDisplay from "./CompactPostDisplay"

import { makeChannelPostList } from "../factories/posts"

describe("PostList", () => {
  const renderPostList = (props = { posts: makeChannelPostList() }) =>
    shallow(<PostList toggleUpvote={() => {}} {...props} />)

  it("should render a list of posts", () => {
    const wrapper = renderPostList()
    assert.lengthOf(wrapper.find(CompactPostDisplay), 20)
  })

  it("should behave well if handed an empty list", () => {
    const wrapper = renderPostList({ posts: [] })
    assert.lengthOf(wrapper.find(CompactPostDisplay), 0)
    assert.equal(wrapper.text(), "There are no posts to display.")
  })

  it("should pass the showChannelLinks prop to CompactPostDisplay", () => {
    const wrapper = renderPostList({
      posts:            makeChannelPostList(),
      showChannelLinks: true
    })
    wrapper.find(CompactPostDisplay).forEach(postSummary => {
      assert.isTrue(postSummary.props().showChannelLink)
    })
  })

  it("should pass the showPinUI prop to CompactPostDisplay", () => {
    [true, false].forEach(showPinUI => {
      const wrapper = renderPostList({
        posts: makeChannelPostList(),
        showPinUI
      })
      wrapper.find(CompactPostDisplay).forEach(postSummary => {
        assert.equal(postSummary.props().showPinUI, showPinUI)
      })
    })
  })

  it("should pass the isModerator prop to CompactPostDisplay", () => {
    [true, false].forEach(isModerator => {
      const wrapper = renderPostList({
        posts: makeChannelPostList(),
        isModerator
      })
      wrapper.find(CompactPostDisplay).forEach(postSummary => {
        assert.equal(postSummary.props().isModerator, isModerator)
      })
    })
  })

  it("should pass the togglePinPost prop to CompactPostDisplay", () => {
    const pinStub = sinon.stub()
    const wrapper = renderPostList({
      posts:         makeChannelPostList(),
      togglePinPost: pinStub
    })
    wrapper.find(CompactPostDisplay).forEach(postSummary => {
      assert.equal(postSummary.props().togglePinPost, pinStub)
    })
  })

  it("should pass the reportPost prop to CompactPostDisplay", () => {
    const reportStub = sinon.stub()
    const wrapper = renderPostList({
      posts:      makeChannelPostList(),
      reportPost: reportStub
    })
    wrapper
      .find(CompactPostDisplay)
      .first()
      .props()
      .reportPost()
    assert.ok(reportStub.called)
  })

  it("should pass the removePost prop to CompactPostDisplay", () => {
    const removeStub = sinon.stub()
    const wrapper = renderPostList({
      posts:      makeChannelPostList(),
      removePost: removeStub
    })
    wrapper
      .find(CompactPostDisplay)
      .first()
      .props()
      .removePost()
    assert.ok(removeStub.called)
  })
})
