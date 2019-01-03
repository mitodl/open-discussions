// @flow
import R from "ramda"
import casual from "casual-browserify"

import { LINK_TYPE_LINK, LINK_TYPE_TEXT } from "../lib/channels"
import { incrementer } from "../lib/util"
import { VALID_POST_SORT_TYPES } from "../lib/picker"

import type { Post, PostListPagination } from "../flow/discussionTypes"

const incr = incrementer()

export const makePost = (
  isURLPost: boolean = false,
  channelName: string = casual.word
): Post => ({
  article_content: null,
  article_text:    null,
  author_headline: casual.sentence,
  author_id:       `justareddituser${String(casual.random)}`,
  author_name:     casual.name,
  channel_name:    channelName,
  channel_title:   casual.string,
  created:         casual.moment.format(),
  edited:          casual.boolean,
  // $FlowFixMe: incr.next().value is never undefined but Flow thinks it may be
  id:              `post${incr.next().value}`,
  num_comments:    casual.integer(0, 25),
  num_reports:     null,
  profile_image:   casual.url,
  post_type:       isURLPost ? LINK_TYPE_LINK : LINK_TYPE_TEXT,
  removed:         casual.boolean,
  score:           casual.integer(-5, 15),
  slug:            casual.word,
  stickied:        casual.boolean,
  subscribed:      casual.boolean,
  text:            isURLPost ? null : casual.text,
  thumbnail:       isURLPost ? casual.url : null,
  title:           casual.sentence,
  upvoted:         casual.boolean,
  url:             isURLPost ? casual.url : null
})

export const makeChannelPostList = (channelName: string = casual.word) =>
  R.range(0, 20).map(() => makePost(casual.boolean, channelName))

export const makeFrontPageList = () =>
  R.range(0, 30).map(() => makePost(casual.boolean))

export const makePagination = (): PostListPagination => ({
  sort:         casual.random_element(VALID_POST_SORT_TYPES),
  before:       "before",
  before_count: 10,
  after:        "after",
  after_count:  20
})
