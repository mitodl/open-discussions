// @flow
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"

import { Markdown, renderTextContent } from "./Markdown"

import { makePost } from "../factories/posts"
import { makeComment } from "../factories/comments"

describe("Markdown", () => {
  const renderMD = text => mount(<Markdown source={text} />)

  const renderTC = content => mount(renderTextContent(content))

  let post, comment

  beforeEach(() => {
    post = makePost()
    post.edited = false
    comment = makeComment(post)
    comment.edited = false
  })

  it("renderTextContent should render a post", () => {
    const wrapper = renderTC(post)
    assert.equal(wrapper.text(), post.text)
  })

  it("renderTextContent should render a comment", () => {
    const wrapper = renderTC(comment)
    assert.equal(wrapper.text(), comment.text)
  })

  it("renderTextContent should add the edited flag, if appropriate", () => {
    post.edited = true
    const wrapper = renderTC(post)
    assert.include(wrapper.text(), "[edited by author]")
  })

  it("should render markdown", () => {
    const wrapper = renderMD("# MARKDOWN\n\nyeah markdown")
    assert.equal(wrapper.find("h1").text(), "MARKDOWN")
    assert.equal(wrapper.text(), "MARKDOWNyeah markdown")
  })

  it("should not render images", () => {
    const wrapper = renderMD(
      "![](https://upload.wikimedia.org/wikipedia/commons/4/4c/Chihuahua1_bvdb.jpg)"
    )
    assert.isNotOk(wrapper.find("img").exists())
  })

  it("should automatically turn URLs into links", () => {
    const wrapper = renderMD(
      "ah I love linking to things https://en.wikipedia.org/wiki/Pie"
    )
    const link = wrapper.find("a")
    assert.ok(link.exists())
    assert.equal(link.props().href, "https://en.wikipedia.org/wiki/Pie")
    assert.deepEqual(link.props().children, [
      "https://en.wikipedia.org/wiki/Pie"
    ])
  })

  it("shouldnt turn non-url brackets into links", () => {
    const wrapper = renderMD("just [bracket] stuff")
    assert.isNotOk(wrapper.find("a").exists())
  })
})
