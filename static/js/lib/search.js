// @flow
/* global SETTINGS: false */
import bodybuilder from "bodybuilder"
import R from "ramda"
import {
  LR_TYPE_COURSE,
  LR_TYPE_BOOTCAMP,
  LR_TYPE_PROGRAM,
  LR_TYPE_USERLIST
} from "../lib/constants"
import {
  SEARCH_FILTER_COMMENT,
  SEARCH_FILTER_POST,
  SEARCH_FILTER_PROFILE
} from "./picker"

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
  SearchParams,
  FacetResult,
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
  ...overrideObject,
  id:          result.id,
  title:       result.title,
  image_src:   result.image_src,
  object_type: result.object_type,
  offered_by:
    "offered_by" in result && result.offered_by
      ? R.toLower(result.offered_by)
      : null,
  platform:     "platform" in result ? result.platform : null,
  availability: "availability" in result ? result.availability : null,
  topics:       result.topics.map(topic => ({ name: topic })),
  prices:       "prices" in result ? result.prices || [] : []
})

const POST_QUERY_FIELDS = [
  "text.english",
  "post_title.english",
  "plain_text.english"
]
const COMMENT_QUERY_FIELDS = ["text.english"]
const PROFILE_QUERY_FIELDS = [
  "author_headline.english",
  "author_bio.english",
  "author_name.english"
]
const COURSE_QUERY_FIELDS = [
  "title.english",
  "short_description.english",
  "full_description.english",
  "year",
  "semester",
  "level",
  "instructors",
  "prices",
  "topics",
  "platform"
]

const BOOTCAMP_QUERY_FIELDS = [
  "title.english",
  "short_description.english",
  "full_description.english",
  "instructors",
  "prices",
  "topics"
]

const LIST_QUERY_FIELDS = [
  "title.english",
  "short_description.english",
  "topics"
]

const OBJECT_TYPE = "type"

const _searchFields = (type: ?string) => {
  if (type === SEARCH_FILTER_POST) {
    return POST_QUERY_FIELDS
  } else if (type === SEARCH_FILTER_COMMENT) {
    return COMMENT_QUERY_FIELDS
  } else if (type === SEARCH_FILTER_PROFILE) {
    return PROFILE_QUERY_FIELDS
  } else if (type === LR_TYPE_COURSE) {
    return COURSE_QUERY_FIELDS
  } else if (type === LR_TYPE_BOOTCAMP) {
    return BOOTCAMP_QUERY_FIELDS
  } else if ([LR_TYPE_PROGRAM, LR_TYPE_USERLIST].includes(type)) {
    return LIST_QUERY_FIELDS
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

const POST_CHANNEL_FIELD = "channel_name"
const COMMENT_CHANNEL_FIELD = "channel_name"
const PROFILE_CHANNEL_FIELD = "author_channel_membership"

const _channelField = (type: ?string) => {
  if (type === "post") {
    return POST_CHANNEL_FIELD
  } else if (type === "comment") {
    return COMMENT_CHANNEL_FIELD
  } else if (type === "profile") {
    return PROFILE_CHANNEL_FIELD
  } else {
    throw new Error("Missing type")
  }
}
export { _channelField as channelField }
import { channelField } from "./search"

const getTypes = (type: ?(string | Array<string>)) => {
  if (type) {
    return Array.isArray(type) ? type : [type]
  } else {
    return [SEARCH_FILTER_COMMENT, SEARCH_FILTER_POST, SEARCH_FILTER_PROFILE]
  }
}

export const buildSearchQuery = ({
  text,
  type,
  channelName,
  from,
  size,
  facets,
  sort
}: SearchParams): Object => {
  let builder = bodybuilder()

  if (!R.isNil(from)) {
    builder = builder.from(from)
  }
  if (!R.isNil(size)) {
    builder = builder.size(size)
  }
  if (sort !== undefined) {
    const { field, option } = sort
    builder.sort(field, option)
  }

  const types = getTypes(type)
  for (const type of types) {
    // One of the text fields must match
    const matchQuery = text
      ? {
        must: {
          multi_match: {
            query:     text,
            fields:    searchFields(type),
            fuzziness: "AUTO"
          }
        }
      }
      : {}

    // If channelName is present add a filter for the type
    const channelClauses = channelName
      ? [
        {
          term: {
            [channelField(type)]: channelName
          }
        }
      ]
      : []

    // Add filters for facets if necessary
    const facetClauses = []
    if (facets) {
      facets.forEach((values, key) => {
        if (key !== OBJECT_TYPE && values && values.length > 0) {
          facetClauses.push({
            bool: {
              should: values.map(value => ({
                term: {
                  [key]: value
                }
              }))
            }
          })
        }
        builder.agg(
          "terms",
          key === OBJECT_TYPE ? "object_type.keyword" : key,
          { size: 10000 },
          key
        )
      })
    }

    builder = builder.orQuery("bool", {
      filter: {
        bool: {
          must: [
            {
              term: {
                object_type: type
              }
            },
            ...channelClauses,
            ...facetClauses
          ]
        }
      },
      ...matchQuery
    })
  }
  return builder.build()
}

export const mergeFacetResults = (...args: Array<FacetResult>) => ({
  buckets: args
    .map(R.prop("buckets"))
    .reduce((buckets, acc) => R.unionWith(R.eqBy(R.prop("key")), buckets, acc))
})

export const SEARCH_GRID_UI = "grid"
export const SEARCH_LIST_UI = "list"
