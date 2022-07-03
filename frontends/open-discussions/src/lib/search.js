// @flow
import { PHONE, TABLET, DESKTOP } from "./constants"

import type {
  CommentInTree,
  LearningResourceSummary,
  Post,
  Profile
} from "../flow/discussionTypes"
import type {
  PostResult,
  CommentResult,
  ProfileResult,
  LearningResourceResult
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
  article_content: result.article_content,
  plain_text:      result.plain_text,
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
  url:             result.post_link_url,
  cover_image:     result.post_cover_image
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

export const searchResultToLearningResource = (
  result: LearningResourceResult,
  overrideObject: LearningResourceSummary = {}
): LearningResourceSummary => ({
  id:          result.id,
  title:       result.title,
  image_src:   result.image_src,
  object_type: result.object_type,
  lists:       result.lists,
  is_favorite: result.is_favorite,
  offered_by:
    "offered_by" in result && result.offered_by ? result.offered_by : [],
  platform:      "platform" in result ? result.platform : null,
  topics:        result.topics ? result.topics.map(topic => ({ name: topic })) : [],
  runs:          "runs" in result ? result.runs : [],
  audience:      result.audience,
  certification: result.certification,
  ...overrideObject
})

export const SEARCH_GRID_UI = "grid"
export const SEARCH_LIST_UI = "list"

export const SEARCH_UI_GRID_WIDTHS = {
  [PHONE]:   1,
  [TABLET]:  2,
  [DESKTOP]: 3
}
