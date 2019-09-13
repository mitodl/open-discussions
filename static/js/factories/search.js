// @flow
/* global SETTINGS: false */
import casual from "casual-browserify"
import R from "ramda"

import { LINK_TYPE_LINK, LINK_TYPE_TEXT } from "../lib/channels"
import {
  platforms,
  LR_TYPE_COURSE,
  LR_TYPE_BOOTCAMP,
  LR_TYPE_ALL
} from "../lib/constants"

import type {
  CommentResult,
  LearningResourceResult,
  PostResult,
  ProfileResult
} from "../flow/searchTypes"
import { makeCourseRun } from "./learning_resources"

export const makeProfileResult = (): ProfileResult => ({
  author_avatar_medium: casual.url,
  author_avatar_small:  casual.url,
  author_bio:           casual.sentence,
  author_headline:      casual.sentence,
  author_id:            casual.word,
  author_name:          casual.full_name,
  object_type:          "profile"
})

export const makeCommentResult = (): CommentResult => ({
  author_avatar_small: casual.url,
  author_headline:     casual.text,
  author_name:         casual.full_name,
  author_id:           casual.username,
  channel_title:       casual.text,
  channel_name:        casual.word,
  comment_id:          `comment_${String(casual.random)}`,
  created:             casual.moment.format(),
  deleted:             casual.coin_flip,
  object_type:         "comment",
  parent_comment_id:   casual.boolean ? `parent_${String(casual.random)}` : null,
  post_id:             `post_${String(casual.random)}`,
  post_slug:           casual.word,
  post_title:          casual.text,
  score:               casual.integer(-5, 15),
  removed:             casual.coin_flip,
  text:                casual.text
})

export const makePostResult = (): PostResult => ({
  article_content:     null,
  plain_text:          null,
  post_cover_image:    null,
  author_avatar_small: casual.url,
  author_headline:     casual.text,
  author_id:           casual.username,
  author_name:         casual.full_name,
  channel_name:        casual.word,
  channel_title:       casual.text,
  created:             casual.moment.format(),
  deleted:             casual.coin_flip,
  num_comments:        casual.integer(0, 14),
  object_type:         "post",
  post_id:             `post_${String(casual.random)}`,
  post_link_url:       casual.url,
  post_link_thumbnail: casual.url,
  post_slug:           casual.word,
  post_title:          casual.text,
  post_type:           casual.coin_flip ? LINK_TYPE_LINK : LINK_TYPE_TEXT,
  removed:             casual.coin_flip,
  score:               casual.integer(-5, 15),
  text:                casual.text
})

export const makeCourseResult = (): LearningResourceResult => ({
  id:                casual.number,
  course_id:         `course_${String(casual.random)}`,
  title:             casual.title,
  url:               casual.url,
  image_src:         "http://image.medium.url",
  short_description: casual.description,
  full_description:  casual.description,
  platform:          casual.random_element([platforms.edX, platforms.OCW]),
  offered_by:        casual.random_element([platforms.edX, platforms.OCW, null]),
  topics:            [casual.word, casual.word],
  object_type:       LR_TYPE_COURSE,
  course_runs:       R.times(makeCourseRun, 3)
})

export const makeBootcampResult = (): LearningResourceResult => ({
  id:                casual.number,
  course_id:         `course_${String(casual.random)}`,
  title:             casual.title,
  url:               casual.url,
  image_src:         "http://image.medium.url",
  short_description: casual.description,
  full_description:  casual.description,
  topics:            [casual.word, casual.word],
  object_type:       LR_TYPE_BOOTCAMP,
  offered_by:        "bootcamps",
  course_runs:       [makeCourseRun()]
})

export const makeLearningResourceResult = (objectType: string) => {
  switch (objectType) {
  case LR_TYPE_COURSE:
    return makeCourseResult()
  case LR_TYPE_BOOTCAMP:
    return makeBootcampResult()
  }
}

export const makeSearchResult = (type: ?string) => {
  if (!type) {
    type = casual.random_element(["post", "comment", "profile"])
  }
  let hit
  switch (type) {
  case "post":
    hit = makePostResult()
    break
  case "comment":
    hit = makeCommentResult()
    break
  case "profile":
    hit = makeProfileResult()
    break
  case LR_TYPE_COURSE:
    hit = makeCourseResult()
    break
  case LR_TYPE_BOOTCAMP:
    hit = makeBootcampResult()
    break
  default:
    // make flow happy
    throw new Error("unknown type")
  }

  return {
    _id:     `id_String${casual.random}`,
    _source: hit
  }
}

export const makeSearchFacetResult = () => {
  return {
    offered_by: {
      buckets: [{ key: "MITx", doc_count: 88 }, { key: "OCW", doc_count: 102 }]
    },
    topics: {
      buckets: [
        { key: "Science", doc_count: 172 },
        { key: "Physics", doc_count: 32 }
      ]
    },
    cost: {
      buckets: [{ key: "free", doc_count: 102 }, { key: "paid", doc_count: 88 }]
    },
    availability: {
      buckets: [
        {
          key:       "availableNow",
          doc_count: 583
        },
        {
          key:       "nextWeek",
          doc_count: 22
        }
      ]
    },
    type: LR_TYPE_ALL
  }
}

export const makeSearchResponse = (
  pageSize: number = SETTINGS.search_page_size,
  total: number = SETTINGS.search_page_size * 2,
  type: ?string,
  withFacets: boolean = false
) => {
  const hits = R.range(0, pageSize).map(() => makeSearchResult(type))
  return {
    hits: {
      total,
      hits
    },
    aggregations: withFacets ? makeSearchFacetResult() : {}
  }
}
