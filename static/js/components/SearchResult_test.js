// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"

import SearchResult from "./SearchResult"
import {
  makeBootcampResult,
  makeCommentResult,
  makeCourseResult,
  makePostResult,
  makeProfileResult
} from "../factories/search"
import {
  searchResultToBootcamp,
  searchResultToComment,
  searchResultToCourse,
  searchResultToPost,
  searchResultToProfile
} from "../lib/search"
import { PROFILE_IMAGE_SMALL } from "../containers/ProfileImage"
import { profileURL } from "../lib/url"

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

  it("renders a course", () => {
    const result = makeCourseResult()
    const wrapper = render(result).dive()
    const course = searchResultToCourse(result)
    course.instructors = []
    const courseDisplay = wrapper.find("CourseCard")
    assert.deepEqual(courseDisplay.prop("object"), course)
  })

  it("renders a bootcamp", () => {
    const result = makeBootcampResult()
    const wrapper = render(result).dive()
    const bootcamp = searchResultToBootcamp(result)
    bootcamp.instructors = []
    const bootcampDisplay = wrapper.find("CourseCard")
    assert.deepEqual(bootcampDisplay.prop("object"), bootcamp)
  })
})
