/* global SETTINGS: false */
import { assert } from "chai"
import sinon from "sinon"

import {
  makeCommentResult,
  makeCourseResult,
  makePostResult,
  makeProfileResult,
  makeLearningResourceResult,
  makeProgramResult
} from "../factories/search"
import {
  searchResultToComment,
  searchResultToLearningResource,
  searchResultToPost,
  searchResultToProfile
} from "./search"
import {
  LR_TYPE_COURSE,
  LR_TYPE_VIDEO,
  LR_TYPE_USERLIST,
  LR_TYPE_LEARNINGPATH,
  LR_TYPE_PODCAST,
  LR_TYPE_PODCAST_EPISODE
} from "../lib/constants"
import { LR_TYPE_PROGRAM } from "./constants"

describe("search functions", () => {
  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("converts a comment search result to a comment", () => {
    const result = makeCommentResult()
    const comment = searchResultToComment(result)
    assert.deepEqual(comment, {
      author_headline: result.author_headline,
      author_id:       result.author_id,
      author_name:     result.author_name,
      comment_type:    "comment",
      created:         result.created,
      deleted:         result.deleted,
      downvoted:       false,
      edited:          false,
      id:              result.comment_id,
      num_reports:     0,
      parent_id:       result.parent_comment_id,
      post_id:         result.post_id,
      profile_image:   result.author_avatar_small,
      removed:         comment.removed,
      replies:         [],
      score:           comment.score,
      subscribed:      false,
      text:            comment.text,
      upvoted:         false
    })
  })

  it("converts a post search result to a post", () => {
    const result = makePostResult()
    const post = searchResultToPost(result)
    assert.deepEqual(post, {
      article_content: result.article_content,
      plain_text:      result.plain_text,
      cover_image:     null,
      author_id:       result.author_id,
      author_name:     result.author_name,
      author_headline: result.author_headline,
      channel_name:    result.channel_name,
      channel_title:   result.channel_title,
      created:         result.created,
      edited:          false,
      id:              result.post_id,
      num_comments:    result.num_comments,
      num_reports:     0,
      post_type:       result.post_type,
      profile_image:   result.author_avatar_small,
      removed:         result.removed,
      score:           result.score,
      slug:            result.post_slug,
      stickied:        false,
      subscribed:      false,
      text:            result.text,
      thumbnail:       result.post_link_thumbnail,
      title:           result.post_title,
      upvoted:         false,
      url:             result.post_link_url
    })
  })

  it("converts a profile search result to a profile", () => {
    const result = makeProfileResult()
    const profile = searchResultToProfile(result)
    assert.deepEqual(profile, {
      bio:                  result.author_bio,
      headline:             result.author_headline,
      image:                result.author_avatar_medium,
      image_file:           result.author_avatar_medium,
      image_medium:         result.author_avatar_medium,
      image_medium_file:    result.author_avatar_medium,
      image_small:          result.author_avatar_small,
      image_small_file:     result.author_avatar_small,
      name:                 result.author_name,
      profile_image_medium: result.author_avatar_medium,
      profile_image_small:  result.author_avatar_small,
      username:             result.author_id
    })
  })

  it("converts a course search result to a learning resource", () => {
    const result = makeCourseResult()
    const course = searchResultToLearningResource(result)
    assert.deepEqual(course, {
      id:            result.id,
      title:         result.title,
      image_src:     result.image_src,
      platform:      result.platform,
      topics:        result.topics.map(topic => ({ name: topic })),
      object_type:   LR_TYPE_COURSE,
      offered_by:    result.offered_by,
      runs:          result.runs,
      is_favorite:   result.is_favorite,
      lists:         result.lists,
      audience:      result.audience,
      certification: result.certification
    })
  })

  it("converts a program search result to a learning resource", () => {
    const result = makeProgramResult()
    const program = searchResultToLearningResource(result)
    assert.deepEqual(program, {
      id:            result.id,
      title:         result.title,
      image_src:     result.image_src,
      platform:      null,
      topics:        result.topics.map(topic => ({ name: topic })),
      object_type:   LR_TYPE_PROGRAM,
      offered_by:    result.offered_by,
      runs:          result.runs,
      is_favorite:   result.is_favorite,
      lists:         result.lists,
      audience:      result.audience,
      certification: result.certification
    })
  })

  it("converts a video search result to a learning resource", () => {
    const result = makeLearningResourceResult(LR_TYPE_VIDEO)
    const video = searchResultToLearningResource(result)
    assert.deepEqual(video, {
      id:            result.id,
      title:         result.title,
      image_src:     result.image_src,
      platform:      null,
      topics:        result.topics.map(topic => ({ name: topic })),
      object_type:   LR_TYPE_VIDEO,
      offered_by:    result.offered_by,
      runs:          result.runs,
      is_favorite:   result.is_favorite,
      lists:         result.lists,
      audience:      result.audience,
      certification: result.certification
    })
  })

  it("converts a podcast search result to a learning resource", () => {
    const result = makeLearningResourceResult(LR_TYPE_PODCAST)
    const podcast = searchResultToLearningResource(result)
    assert.deepEqual(podcast, {
      id:            result.id,
      title:         result.title,
      image_src:     result.image_src,
      platform:      null,
      topics:        result.topics.map(topic => ({ name: topic })),
      object_type:   LR_TYPE_PODCAST,
      offered_by:    result.offered_by,
      runs:          result.runs,
      is_favorite:   result.is_favorite,
      lists:         result.lists,
      audience:      result.audience,
      certification: result.certification
    })
  })

  it("converts a podcast episode search result to a learning resource", () => {
    const result = makeLearningResourceResult(LR_TYPE_PODCAST_EPISODE)
    const podcastEpisode = searchResultToLearningResource(result)
    assert.deepEqual(podcastEpisode, {
      id:            result.id,
      title:         result.title,
      image_src:     result.image_src,
      platform:      null,
      topics:        result.topics.map(topic => ({ name: topic })),
      object_type:   LR_TYPE_PODCAST_EPISODE,
      offered_by:    result.offered_by,
      runs:          result.runs,
      is_favorite:   result.is_favorite,
      lists:         result.lists,
      audience:      result.audience,
      certification: result.certification
    })
  })

  //
  ;[LR_TYPE_USERLIST, LR_TYPE_LEARNINGPATH].forEach(listType => {
    it(`converts a ${listType} search result to a learning resource`, () => {
      const result = makeLearningResourceResult(listType)
      const video = searchResultToLearningResource(result)
      assert.deepEqual(video, {
        id:            result.id,
        title:         result.title,
        image_src:     result.image_src,
        platform:      null,
        topics:        result.topics.map(topic => ({ name: topic })),
        object_type:   listType,
        offered_by:    result.offered_by,
        runs:          result.runs,
        is_favorite:   result.is_favorite,
        lists:         result.lists,
        audience:      result.audience,
        certification: result.certification
      })
    })
  })

  //
  ;[
    LR_TYPE_COURSE,
    LR_TYPE_VIDEO,
    LR_TYPE_PODCAST,
    LR_TYPE_PODCAST_EPISODE
  ].forEach(objectType => {
    it(`takes an overrideObject with ${objectType}`, () => {
      const result = makeLearningResourceResult(objectType)
      const object = searchResultToLearningResource(result, {
        test_field: true
      })
      assert.isTrue(object.test_field)
    })
  })
})
