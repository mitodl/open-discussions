// @flow
/* global SETTINGS: false */
import bodybuilder from "bodybuilder"
import R from "ramda"
import {
  DEFAULT_START_DT,
  LR_TYPE_BOOTCAMP,
  LR_TYPE_COURSE,
  LR_TYPE_PROGRAM,
  LR_TYPE_USERLIST,
  PHONE,
  TABLET,
  DESKTOP
} from "./constants"
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
    "offered_by" in result && result.offered_by ? result.offered_by : null,
  platform: "platform" in result ? result.platform : null,
  topics:   result.topics.map(topic => ({ name: topic })),
  runs:     "runs" in result ? result.runs : []
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
  "title.english^3",
  "short_description.english^2",
  "full_description.english",
  "topics",
  "platform",
  "course_id",
  "coursenum^5",
  "offered_by"
]

const BOOTCAMP_QUERY_FIELDS = [
  "title.english^3",
  "short_description.english^2",
  "full_description.english",
  "course_id",
  "coursenum^5",
  "offered_by"
]

export const RESOURCE_QUERY_NESTED_FIELDS = [
  "runs.year",
  "runs.semester",
  "runs.level",
  "runs.instructors^5"
]

const LIST_QUERY_FIELDS = [
  "title.english",
  "short_description.english",
  "topics"
]

export const AVAILABLE_NOW = "availableNow"
const AVAILABLE_NEXT_WEEK = "nextWeek"
const AVAILABLE_NEXT_MONTH = "nextMonth"
const AVAILABLE_NEXT_3MONTHS = "next3Months"
const AVAILABLE_NEXT_6MONTHS = "next6Months"
const AVAILABLE_NEXT_YEAR = "nextYear"

const COST_FREE = "free"
const COST_PAID = "paid"

export const AVAILABILITY_MAPPING = {
  [AVAILABLE_NOW]: {
    label:  "Available Now",
    filter: { to: "now" }
  },
  [AVAILABLE_NEXT_WEEK]: {
    label:  "Within next week",
    filter: { from: "now", to: "now+7d" }
  },
  [AVAILABLE_NEXT_MONTH]: {
    label:  "Within next month",
    filter: { from: "now", to: "now+1M" }
  },
  [AVAILABLE_NEXT_3MONTHS]: {
    label:  "Within next 3 months",
    filter: { from: "now", to: "now+3M" }
  },
  [AVAILABLE_NEXT_6MONTHS]: {
    label:  "Within next 6 months",
    filter: { from: "now", to: "now+6M" }
  },
  [AVAILABLE_NEXT_YEAR]: {
    label:  "Within next year",
    filter: { from: "now", to: "now+12M" }
  }
}

export const COST_MAPPING = {
  [COST_FREE]: {
    label:  "Free",
    filter: { to: 0.01 }
  },
  [COST_PAID]: {
    label:  "Paid",
    filter: { from: 0.01 }
  }
}

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
import { emptyOrNil } from "./util"

const getTypes = (type: ?(string | Array<string>)) => {
  if (type) {
    return Array.isArray(type) ? type : [type]
  } else {
    return [SEARCH_FILTER_COMMENT, SEARCH_FILTER_POST, SEARCH_FILTER_PROFILE]
  }
}

const buildAvailabilityQuery = (
  builder: Object,
  values: Array<string>,
  facetClauses: Array<Object>
) => {
  // Filter results by course run availability facet converted to date ranges
  if (values && values.length > 0) {
    const facetFilter = values.map(value => ({
      nested: {
        path:  "runs",
        query: {
          range: {
            "runs.best_start_date": AVAILABILITY_MAPPING[value].filter
          }
        }
      }
    }))
    // 'availableNow' should include courses without start dates
    if (values.includes(AVAILABLE_NOW)) {
      facetFilter.push({
        nested: {
          path:  "runs",
          query: {
            bool: {
              must_not: {
                exists: {
                  field: "runs.best_start_date"
                }
              }
            }
          }
        }
      })
    }
    facetClauses.push({
      bool: {
        should: facetFilter
      }
    })
  }
  // Make availability aggregations based on course run date ranges
  builder.agg("nested", { path: "runs" }, "availability", aggr =>
    aggr.agg(
      "date_range",
      "runs.best_start_date",
      {
        missing: DEFAULT_START_DT,
        keyed:   false,
        ranges:  [
          {
            key: AVAILABLE_NOW,
            ...AVAILABILITY_MAPPING.availableNow.filter
          },
          {
            key: AVAILABLE_NEXT_WEEK,
            ...AVAILABILITY_MAPPING.nextWeek.filter
          },
          {
            key: AVAILABLE_NEXT_MONTH,
            ...AVAILABILITY_MAPPING.nextMonth.filter
          },
          {
            key: AVAILABLE_NEXT_3MONTHS,
            ...AVAILABILITY_MAPPING.next3Months.filter
          },
          {
            key: AVAILABLE_NEXT_6MONTHS,
            ...AVAILABILITY_MAPPING.next6Months.filter
          },
          {
            key: AVAILABLE_NEXT_YEAR,
            ...AVAILABILITY_MAPPING.nextYear.filter
          }
        ]
      },
      "runs",
      aggr => aggr.agg("reverse_nested", null, {}, "courses")
    )
  )
}

const buildCostQuery = (
  builder: Object,
  values: Array<string>,
  facetClauses: Array<Object>
) => {
  // Filter results by course run price (free or paid)
  if (values && values.length > 0) {
    const facetFilter = values.map(value => ({
      nested: {
        path:  "runs.prices",
        query: {
          range: {
            "runs.prices.price": COST_MAPPING[value].filter
          }
        }
      }
    }))
    facetClauses.push({
      bool: {
        should: facetFilter
      }
    })
  }
  // Make cost aggregations based on course run prices
  builder.agg("nested", { path: "runs.prices" }, "cost", aggr =>
    aggr.agg(
      "range",
      "runs.prices.price",
      {
        missing: 0,
        keyed:   false,
        ranges:  [
          {
            key: COST_FREE,
            ...COST_MAPPING.free.filter
          },
          {
            key: COST_PAID,
            ...COST_MAPPING.paid.filter
          }
        ]
      },
      "prices",
      aggr => aggr.agg("reverse_nested", null, {}, "courses")
    )
  )
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
    let textQuery = {}
    const textClauses = []
    let textFilter = []
    if (!emptyOrNil(text)) {
      textClauses.push({
        multi_match: {
          query:     text,
          fields:    searchFields(type),
          fuzziness: "AUTO"
        }
      })
      if ([LR_TYPE_BOOTCAMP, LR_TYPE_COURSE, LR_TYPE_PROGRAM].includes(type)) {
        textClauses.push({
          nested: {
            path:  "runs",
            query: {
              multi_match: {
                query:     text,
                fields:    RESOURCE_QUERY_NESTED_FIELDS,
                fuzziness: "AUTO"
              }
            }
          }
        })
      }
      textQuery = { should: textClauses }
      textFilter = [{ bool: textQuery }]
    }

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
        if (
          ![OBJECT_TYPE, "availability", "cost"].includes(key) &&
          values &&
          values.length > 0
        ) {
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
        if (key === "availability") {
          buildAvailabilityQuery(builder, values, facetClauses)
        } else if (key === "cost") {
          buildCostQuery(builder, values, facetClauses)
        } else {
          builder.agg(
            "terms",
            key === OBJECT_TYPE ? "object_type.keyword" : key,
            { size: 10000 },
            key
          )
        }
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
            ...facetClauses,
            // Add multimatch text query here to filter out non-matching results
            ...textFilter
          ]
        }
      },
      // Add multimatch text query here again to score results based on match
      ...textQuery
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

export const SEARCH_UI_GRID_WIDTHS = {
  [PHONE]:   1,
  [TABLET]:  2,
  [DESKTOP]: 3
}
