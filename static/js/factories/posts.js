// @flow
import R from "ramda"
import casual from "casual-browserify"

import { incrementer } from "../factories/util"
import { VALID_POST_SORT_TYPES } from "../lib/sorting"

import type { Post, PostListPagination } from "../flow/discussionTypes"

const incr = incrementer()

export const makePost = (
  isURLPost: boolean = false,
  channelName: string = casual.word
): Post => ({
  // $FlowFixMe: incr.next().value is never undefined but Flow thinks it may be
  id:              `post${incr.next().value}`,
  title:           casual.sentence,
  slug:            casual.word,
  score:           Math.round(Math.random() * 15),
  upvoted:         Math.random() < 0.5,
  author_id:       `justareddituser${String(Math.random())}`,
  text:            isURLPost ? null : casual.text,
  url:             isURLPost ? casual.url : null,
  created:         casual.moment.format(),
  num_comments:    Math.round(Math.random() * 10),
  channel_name:    channelName,
  channel_title:   casual.string,
  profile_image:   casual.url,
  author_name:     casual.name,
  author_headline: casual.sentence,
  edited:          casual.boolean,
  stickied:        casual.boolean,
  removed:         casual.boolean,
  num_reports:     null,
  subscribed:      casual.boolean,
  thumbnail:       isURLPost ? casual.url : null
})

export const makeChannelPostList = (channelName: string = casual.word) =>
  R.range(0, 20).map(() => makePost(Math.random() > 0.5, channelName))

export const makeFrontPageList = () =>
  R.range(0, 30).map(() => makePost(Math.random() > 0.5))

export const makePagination = (): PostListPagination => ({
  sort:         casual.random_element(VALID_POST_SORT_TYPES),
  before:       "before",
  before_count: 10,
  after:        "after",
  after_count:  20
})
