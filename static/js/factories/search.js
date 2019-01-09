// @flow
/* global SETTINGS: false */
import casual from "casual-browserify"
import R from "ramda"

import { LINK_TYPE_LINK, LINK_TYPE_TEXT } from "../lib/channels"

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
  article_content:     null,
  article_text:        null,
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

export const makeSearchResult = () => {
  const type = casual.random_element(["post", "comment", "profile"])
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
  default:
    // make flow happy
    throw new Error("unknown type")
  }

  return {
    _id:     `id_String${casual.random}`,
    _source: hit
  }
}

export const makeSearchResponse = (
  pageSize: number = SETTINGS.search_page_size,
  total: number = SETTINGS.search_page_size * 2
) => {
  const hits = R.range(0, pageSize).map(makeSearchResult)
  return {
    hits: {
      total,
      hits
    }
  }
}
