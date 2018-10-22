// @flow
import bodybuilder from "bodybuilder"
import R from "ramda"

import type { CommentInTree, Post, Profile } from "../flow/discussionTypes"
import type {
  PostResult,
  CommentResult,
  ProfileResult,
  SearchParams
} from "../flow/searchTypes"

export const searchResultToComment = (
  result: CommentResult
): CommentInTree => ({
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
  removed:         result.removed,
  replies:         [],
  text:            result.text,
  score:           result.score,
  subscribed:      false,
  upvoted:         false
})

export const searchResultToPost = (result: PostResult): Post => ({
  author_headline: result.author_headline,
  author_id:       result.author_id,
  author_name:     result.author_name,
  channel_name:    result.channel_name,
  channel_title:   result.channel_title,
  created:         result.created,
  edited:          false,
  id:              result.post_id,
  num_comments:    result.num_comments,
  num_reports:     0,
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

export const searchResultToProfile = (result: ProfileResult): Profile => ({
  bio:                  result.author_bio,
  headline:             result.author_headline,
  name:                 result.author_name,
  image:                result.author_avatar_medium,
  image_small:          result.author_avatar_small,
  image_medium:         result.author_avatar_medium,
  image_file:           result.author_avatar_medium,
  image_small_file:     result.author_avatar_small,
  image_medium_file:    result.author_avatar_medium,
  profile_image_small:  result.author_avatar_small,
  profile_image_medium: result.author_avatar_medium,
  username:             result.author_id
})

const POST_QUERY_FIELDS = ["text", "post_title"]
const COMMENT_QUERY_FIELDS = ["text"]
const PROFILE_QUERY_FIELDS = ["author_headline", "author_bio"]
const _searchFields = (type: ?string) => {
  if (type === "post") {
    return POST_QUERY_FIELDS
  } else if (type === "comment") {
    return COMMENT_QUERY_FIELDS
  } else if (type === "profile") {
    return PROFILE_QUERY_FIELDS
  } else {
    return R.uniq([
      ...POST_QUERY_FIELDS,
      ...COMMENT_QUERY_FIELDS,
      ...PROFILE_QUERY_FIELDS
    ])
  }
}
export { _searchFields as searchFields }
import { searchFields } from "./search"

const POST_CHANNEL_FIELDS = ["channel_name"]
const COMMENT_CHANNEL_FIELDS = ["channel_name"]
const PROFILE_CHANNEL_FIELDS = ["author_channel_membership"]
const _channelFields = (type: ?string) => {
  if (type === "post") {
    return POST_CHANNEL_FIELDS
  } else if (type === "comment") {
    return COMMENT_CHANNEL_FIELDS
  } else if (type === "profile") {
    return PROFILE_CHANNEL_FIELDS
  } else {
    return R.uniq([
      ...POST_CHANNEL_FIELDS,
      ...COMMENT_CHANNEL_FIELDS,
      ...PROFILE_CHANNEL_FIELDS
    ])
  }
}
export { _channelFields as channelFields }
import { channelFields } from "./search"

export const buildSearchQuery = ({
  text,
  type,
  channelName,
  from,
  size
}: SearchParams): Object => {
  let builder = bodybuilder()
  if (type) {
    builder = builder.filter("term", "object_type", type)
  } else {
    // TEMPORARY: prevent search filter on profile. If type is present we will rely on UI to not show profile option
    builder = builder.filter("terms", "object_type", ["comment", "post"])
  }
  if (!R.isNil(from)) {
    builder = builder.from(from)
  }
  if (!R.isNil(size)) {
    builder = builder.size(size)
  }
  if (channelName) {
    const fields = channelFields(type)
    for (const field of fields) {
      builder = builder.orFilter("term", field, channelName)
    }
  }
  if (text) {
    const fields = searchFields(type)
    builder = builder.query("multi_match", "fields", fields, {
      query: text
    })
  }
  return builder.build()
}
