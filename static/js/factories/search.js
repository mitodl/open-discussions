// @flow
import casual from "casual-browserify"

import type {
  CommentResult,
  PostResult,
  ProfileResult
} from "../flow/searchTypes"

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
  removed:             casual.coin_flip,
  score:               casual.integer(-5, 15),
  text:                casual.text
})
