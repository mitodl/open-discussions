// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"

import SearchResult from "./SearchResult"
import {
  makeCommentResult,
  makePostResult,
  makeProfileResult
} from "../factories/search"
import {
  searchResultToComment,
  searchResultToPost,
  searchResultToProfile
} from "../lib/search"
import { PROFILE_IMAGE_SMALL } from "../containers/ProfileImage"
import { profileURL } from "../lib/url"

describe("SearchResult", () => {
  const render = ({ result, upvotedPost }) =>
    shallow(<SearchResult result={result} upvotedPost={upvotedPost} />)

  it("renders a profile card", () => {
    const result = makeProfileResult()
    const upvotedPost = null
    const wrapper = render({ result, upvotedPost}).dive()
    const profile = searchResultToProfile(result)
    const profileImage = wrapper.find("Connect(ProfileImage)")
    assert.deepEqual(profileImage.prop("profile"), profile)
    assert.equal(profileImage.prop("imageSize"), PROFILE_IMAGE_SMALL)
    assert.equal(wrapper.find(".name").prop("to"), profileURL(profile.username))
    assert.equal(
      wrapper
        .find(".name")
        .children()
        .text(),
      profile.name
    )
    assert.equal(
      wrapper
        .find(".headline")
        .children()
        .text(),
      profile.headline
    )
  })

  it("renders a post", () => {
    const result = makePostResult()
    const upvotedPost = null
    const wrapper = render({ result, upvotedPost }).dive()
    const post = searchResultToPost(result)
    const postDisplay = wrapper.find("Connect(CompactPostDisplay)")
    assert.deepEqual(postDisplay.prop("post"), post)
  })

  it("renders an upvoted post", () => {
    const result = makePostResult()
    const post = searchResultToPost(result)
    const upvotedPost = Object.assign({}, post)
    upvotedPost.upvoted = true
    upvotedPost.score += 1
    const wrapper = render({ result, upvotedPost }).dive()
    const postDisplay = wrapper.find("Connect(CompactPostDisplay)")
    assert.deepEqual(postDisplay.prop("post"), upvotedPost)
  })

  it("renders a comment", () => {
    const result = makeCommentResult()
    const upvotedPost = null
    const wrapper = render({ result, upvotedPost }).dive()
    const comment = searchResultToComment(result)
    const commentTree = wrapper.find("CommentTree")
    assert.deepEqual(commentTree.prop("comments"), [comment])
  })
})
