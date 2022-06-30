// @flow
import { assert } from "chai"
import sinon from "sinon"

import PostList from "./PostList"
import CompactPostDisplay from "./CompactPostDisplay"

import { makeChannelPostList } from "../factories/posts"
import { configureShallowRenderer } from "../lib/test_utils"

describe("PostList", () => {
  let renderPostList

  beforeEach(() => {
    renderPostList = configureShallowRenderer(PostList, {
      reportPost: sinon.stub(),
      posts:      makeChannelPostList()
    })
  })

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
      showChannelLinks: true
    })
    wrapper.find(CompactPostDisplay).forEach(postSummary => {
      assert.isTrue(postSummary.props().showChannelLink)
    })
  })

  it("should pass the showPinUI prop to CompactPostDisplay", () => {
    [true, false].forEach(showPinUI => {
      const wrapper = renderPostList({
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
      togglePinPost: pinStub
    })
    wrapper.find(CompactPostDisplay).forEach(postSummary => {
      assert.equal(postSummary.props().togglePinPost, pinStub)
    })
  })

  it("should pass the reportPost prop to CompactPostDisplay", () => {
    const reportStub = sinon.stub()
    const wrapper = renderPostList({
      reportPost: reportStub
    })
    wrapper.find(CompactPostDisplay).first().props().reportPost()
    assert.ok(reportStub.called)
  })

  it("should pass the removePost prop to CompactPostDisplay", () => {
    const removeStub = sinon.stub()
    const wrapper = renderPostList({
      removePost: removeStub
    })
    wrapper.find(CompactPostDisplay).first().props().removePost()
    assert.ok(removeStub.called)
  })
})
