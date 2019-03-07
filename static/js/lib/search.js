// @flow
/* global SETTINGS: false */
import bodybuilder from "bodybuilder"
import R from "ramda"

import type {
  CommentInTree,
  Course,
  Post,
  Profile
} from "../flow/discussionTypes"
import type {
  PostResult,
  CommentResult,
  ProfileResult,
  SearchParams,
  CourseResult
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

export const searchResultToCourse = (result: CourseResult): Course => ({
  id:                result.id,
  course_id:         result.course_id,
  url:               result.url,
  title:             result.title,
  image_src:         result.image_src,
  short_description: result.short_description,
  full_description:  result.full_description,
  platform:          result.platform,
  language:          result.language,
  semester:          result.semester,
  year:              result.year,
  level:             result.level,
  start_date:        result.start_date,
  end_date:          result.end_date,
  enrollment_start:  result.enrollment_start,
  enrollment_end:    result.enrollment_end,
  instructors:       [],
  topics:            result.topics.map(topic => ({ name: topic })),
  prices:            result.prices
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
  "author_name"
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

const _searchFields = (type: ?string) => {
  if (type === "post") {
    return POST_QUERY_FIELDS
  } else if (type === "comment") {
    return COMMENT_QUERY_FIELDS
  } else if (type === "profile") {
    return PROFILE_QUERY_FIELDS
  } else if (type === "course") {
    return COURSE_QUERY_FIELDS
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

export const buildSearchQuery = ({
  text,
  type,
  channelName,
  from,
  size,
  facets
}: SearchParams): Object => {
  let builder = bodybuilder()

  if (!R.isNil(from)) {
    builder = builder.from(from)
  }
  if (!R.isNil(size)) {
    builder = builder.size(size)
  }
  const types = type ? [type] : ["comment", "post", "profile"]
  for (const type of types) {
    // One of the text fields must match
    const matchQuery = text
      ? {
        must: {
          multi_match: {
            query:  text,
            fields: searchFields(type)
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
        const facetClause =
          values && values.length > 0
            ? [
              {
                bool: {
                  should: values.map(value => ({
                    term: {
                      [key]: value
                    }
                  }))
                }
              }
            ]
            : []
        facetClauses.push(...facetClause)
        builder.agg("terms", key, { size: 10000 }, key)
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
