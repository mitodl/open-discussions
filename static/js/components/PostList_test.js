// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"

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
})
