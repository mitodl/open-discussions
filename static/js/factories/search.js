// @flow
/* global SETTINGS: false */
import casual from "casual-browserify"
import R from "ramda"

import { LINK_TYPE_LINK, LINK_TYPE_TEXT } from "../lib/channels"
import {
  COURSE_ARCHIVED,
  COURSE_CURRENT,
  platforms,
  LR_TYPE_COURSE,
  LR_TYPE_BOOTCAMP
} from "../lib/constants"

import type {
  CommentResult,
  LearningResourceResult,
  PostResult,
  ProfileResult
} from "../flow/searchTypes"
import { SEARCH_FILTER_ALL_RESOURCES } from "../lib/picker"

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
  language:          casual.random_element(["en-US", "fr", null]),
  semester:          casual.random_element(["Fall", "Spring", null]),
  year:              casual.year,
  level:             casual.random_element(["Graduate", "Undergraduate", null]),
  start_date:        casual.date("YYYY-MM-DD[T]HH:mm:ss[Z]"),
  end_date:          casual.date("YYYY-MM-DD[T]HH:mm:ss[Z]"),
  enrollment_start:  casual.date("YYYY-MM-DD[T]HH:mm:ss[Z]"),
  enrollment_end:    casual.date("YYYY-MM-DD[T]HH:mm:ss[Z]"),
  instructors:       ["instuctor 1", "instructor 2"],
  topics:            [casual.word, casual.word],
  prices:            [{ mode: "audit", price: casual.number }],
  object_type:       LR_TYPE_COURSE,
  availability:
    casual.random_element[(COURSE_ARCHIVED, COURSE_CURRENT, "Upcoming")]
})

export const makeBootcampResult = (): LearningResourceResult => ({
  id:                casual.number,
  course_id:         `course_${String(casual.random)}`,
  title:             casual.title,
  url:               casual.url,
  image_src:         "http://image.medium.url",
  short_description: casual.description,
  full_description:  casual.description,
  language:          casual.random_element(["en-US", "fr", null]),
  year:              casual.year,
  start_date:        casual.date("YYYY-MM-DD[T]HH:mm:ss[Z]"),
  end_date:          casual.date("YYYY-MM-DD[T]HH:mm:ss[Z]"),
  enrollment_start:  casual.date("YYYY-MM-DD[T]HH:mm:ss[Z]"),
  enrollment_end:    casual.date("YYYY-MM-DD[T]HH:mm:ss[Z]"),
  instructors:       ["instuctor 1", "instructor 2"],
  topics:            [casual.word, casual.word],
  prices:            [{ mode: "audit", price: casual.number }],
  object_type:       LR_TYPE_BOOTCAMP,
  availability:
    casual.random_element[(COURSE_ARCHIVED, COURSE_CURRENT, "Upcoming")]
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
    platform: {
      buckets: [{ key: "mitx", doc_count: 88 }, { key: "ocw", doc_count: 102 }]
    },
    topics: {
      buckets: [
        { key: "Science", doc_count: 172 },
        { key: "Physics", doc_count: 32 }
      ]
    },
    availability: {
      buckets: [
        { key: "Archived", doc_count: 33 },
        { key: "Upcoming", doc_count: 67 }
      ]
    },
    type: SEARCH_FILTER_ALL_RESOURCES
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
