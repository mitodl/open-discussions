// @flow
import R from "ramda"
import casual from "casual-browserify"

import { incrementer } from "../factories/util"
import type { Post } from "../flow/discussionTypes"

const incr = incrementer()

export const makePost = (isURLPost: boolean = false, channelName: string = casual.word): Post => ({
  // $FlowFixMe: incr.next().value is never undefined but Flow thinks it may be
  id:           `post${incr.next().value}`,
  title:        casual.sentence,
  score:        Math.round(Math.random() * 15),
  upvoted:      Math.random() < 0.5,
  author_id:    `justareddituser${String(Math.random())}`,
  text:         isURLPost ? null : casual.text,
  url:          isURLPost ? casual.url : null,
  created:      casual.moment.format(),
  num_comments: Math.round(Math.random() * 10),
  channel_name: channelName
})

export const makeChannelPostList = (channelName: string = casual.word) =>
  R.range(0, 20).map(() => makePost(Math.random() > 0.5, channelName))

export const makeFrontPageList = () => R.range(0, 30).map(() => makePost(Math.random() > 0.5))
