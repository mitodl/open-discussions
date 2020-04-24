import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"

import { LearningResourceCard } from "./LearningResourceCard"
import SearchResult from "./SearchResult"

import {
  makeCommentResult,
  makePostResult,
  makeProfileResult,
  makeLearningResourceResult
} from "../factories/search"
import { makeLearningResource } from "../factories/learning_resources"
import {
  searchResultToComment,
  searchResultToLearningResource,
  searchResultToPost,
  searchResultToProfile
} from "../lib/search"
import { PROFILE_IMAGE_SMALL } from "./ProfileImage"
import { profileURL } from "../lib/url"
import { LR_TYPE_COURSE, LR_TYPE_PROGRAM } from "../lib/constants"

describe("SearchResult", () => {
  const render = (result, props = {}) =>
    shallow(<SearchResult result={result} {...props} />)

  it("renders a profile card", () => {
    const result = makeProfileResult()
    const wrapper = render(result).dive()
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
    const wrapper = render(result).dive()
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
    const wrapper = render(result, { upvotedPost }).dive()
    const postDisplay = wrapper.find("Connect(CompactPostDisplay)")
    assert.deepEqual(postDisplay.prop("post"), upvotedPost)
  })

  it("renders a comment", () => {
    const result = makeCommentResult()
    const wrapper = render(result).dive()
    const comment = searchResultToComment(result)
    const commentTree = wrapper.find("CommentTree")
    assert.deepEqual(commentTree.prop("comments"), [comment])
  })

  it("renders a comment that has been voted on", () => {
    const result = makeCommentResult()
    const comment = searchResultToComment(result)
    const votedComment = {
      ...comment,
      upvoted: true,
      score:   (comment.score += 1)
    }
    const wrapper = render(result, { votedComment }).dive()
    const commentTree = wrapper.find("CommentTree")
    assert.deepEqual(commentTree.prop("comments"), [votedComment])
  })

  //
  ;[LR_TYPE_COURSE, LR_TYPE_PROGRAM].forEach(objectType => {
    it(`renders a ${objectType}`, () => {
      const result = makeLearningResourceResult(objectType)
      const object = searchResultToLearningResource(result)
      const wrapper = render(result).dive()
      const resourceDisplay = wrapper.find(LearningResourceCard)
      assert.deepEqual(resourceDisplay.prop("object"), object)
    })

    it(`should pass down an override ${objectType}, if passed one`, () => {
      const result = makeLearningResourceResult(objectType)
      const overrideObject = makeLearningResource(objectType)
      const resourceCard = render(result, { overrideObject })
        .dive()
        .find(LearningResourceCard)
      assert.deepEqual(
        resourceCard.prop("object"),
        searchResultToLearningResource(result, overrideObject)
      )
    })
  })
})
