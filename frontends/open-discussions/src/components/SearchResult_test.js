import { assert } from "chai"

import { LearningResourceCard } from "./LearningResourceCard"
import SearchResult from "./SearchResult"

import {
  makeCommentResult,
  makePostResult,
  makeProfileResult,
  makeLearningResourceResult
} from "../factories/search"
import {
  searchResultToComment,
  searchResultToLearningResource,
  searchResultToPost,
  searchResultToProfile
} from "../lib/search"
import { PROFILE_IMAGE_SMALL } from "./ProfileImage"
import { profileURL } from "../lib/url"
import { LR_TYPE_COURSE, LR_TYPE_PROGRAM } from "../lib/constants"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("SearchResult", () => {
  let helper, render

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    render = helper.configureReduxQueryRenderer(SearchResult)
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("renders a profile card", async () => {
    const result = makeProfileResult()
    const { wrapper } = await render({ result })
    const profile = searchResultToProfile(result)
    const profileImage = wrapper.find("Connect(ProfileImage)")
    assert.deepEqual(profileImage.prop("profile"), profile)
    assert.equal(profileImage.prop("imageSize"), PROFILE_IMAGE_SMALL)
    assert.equal(
      wrapper
        .find(".name")
        .at(0)
        .prop("to"),
      profileURL(profile.username)
    )
    assert.equal(
      wrapper
        .find(".name")
        .at(0)
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

  it("renders a post", async () => {
    const result = makePostResult()
    const { wrapper } = await render({ result })
    const post = searchResultToPost(result)
    const postDisplay = wrapper.find("Connect(CompactPostDisplay)")
    assert.deepEqual(postDisplay.prop("post"), post)
  })

  it("renders an upvoted post", async () => {
    const result = makePostResult()
    const post = searchResultToPost(result)
    const upvotedPost = Object.assign({}, post)
    upvotedPost.upvoted = true
    upvotedPost.score += 1
    const { wrapper } = await render({ result, upvotedPost })
    const postDisplay = wrapper.find("Connect(CompactPostDisplay)")
    assert.deepEqual(postDisplay.prop("post"), upvotedPost)
  })

  it("renders a comment", async () => {
    const result = makeCommentResult()
    const { wrapper } = await render({ result })
    const comment = searchResultToComment(result)
    const commentTree = wrapper.find("CommentTree")
    assert.deepEqual(commentTree.prop("comments"), [comment])
  })

  it("renders a comment that has been voted on", async () => {
    const result = makeCommentResult()
    const comment = searchResultToComment(result)
    const votedComment = {
      ...comment,
      upvoted: true,
      score:   (comment.score += 1)
    }
    const { wrapper } = await render({ result, votedComment })
    const commentTree = wrapper.find("CommentTree")
    assert.deepEqual(commentTree.prop("comments"), [votedComment])
  })

  //
  ;[LR_TYPE_COURSE, LR_TYPE_PROGRAM].forEach(objectType => {
    it(`renders a ${objectType}`, async () => {
      const result = makeLearningResourceResult(objectType)
      const object = searchResultToLearningResource(result)
      const { wrapper } = await render({ result })
      const resourceDisplay = wrapper.find(LearningResourceCard)
      assert.deepEqual(resourceDisplay.prop("object"), object)
    })
  })
})
