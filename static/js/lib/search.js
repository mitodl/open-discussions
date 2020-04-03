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
  LR_TYPE_VIDEO,
  PHONE,
  TABLET,
  DESKTOP,
  LR_TYPE_ALL
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
  id:          result.id,
  title:       result.title,
  image_src:   result.image_src,
  object_type: result.object_type,
  lists:       result.lists,
  is_favorite: result.is_favorite,
  offered_by:
    "offered_by" in result && result.offered_by ? result.offered_by : [],
  platform: "platform" in result ? result.platform : null,
  topics:   result.topics ? result.topics.map(topic => ({ name: topic })) : [],
  runs:     "runs" in result ? result.runs : [],
  ...overrideObject
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
const VIDEO_QUERY_FIELDS = [
  "title.english^3",
  "short_description.english^2",
  "full_description.english",
  "transcript.english^2",
  "topics",
  "platform",
  "video_id",
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

const LEARN_SUGGEST_FIELDS = ["title.trigram", "short_description.trigram"]
const CHANNEL_SUGGEST_FIELDS = ["suggest_field1", "suggest_field2"]

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
  } else if (type === LR_TYPE_VIDEO) {
    return VIDEO_QUERY_FIELDS
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
import { emptyOrNil, isDoubleQuoted } from "./util"

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
  from,
  size,
  sort,
  facets,
  channelName
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
  return emptyOrNil(R.intersection(LR_TYPE_ALL, types))
    ? buildChannelQuery(builder, text, types, channelName)
    : buildLearnQuery(builder, text, types, facets)
}

export const buildFacetSubQuery = (
  facets: ?Map<string, Array<string>>,
  builder: any
) => {
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
            // $FlowFixMe: shut up flow
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
  return facetClauses
}

export const buildSuggestQuery = (
  text: string,
  suggestFields: Array<string>
) => {
  const suggest = {
    text
  }
  suggestFields.forEach(
    field =>
      // $FlowFixMe: yes the fields are missing and I'm adding them
      (suggest[field] = {
        phrase: {
          field:      `${field}`,
          size:       5,
          gram_size:  1,
          confidence: 0.0001,
          max_errors: 3,
          collate:    {
            query: {
              source: {
                match_phrase: {
                  "{{field_name}}": "{{suggestion}}"
                }
              }
            },
            params: { field_name: `${field}` },
            prune:  true
          }
        }
      })
  )
  return suggest
}

export const buildDefaultSort = () => {
  return [
    { minimum_price: { order: "asc" } },
    { default_search_priority: { order: "desc" } },
    { created: { order: "desc" } }
  ]
}

export const buildOrQuery = (
  builder: any,
  searchType: string,
  textQuery: any,
  extraClauses: any
) => {
  const textFilter = emptyOrNil(textQuery) ? [] : [{ bool: textQuery }]
  builder = builder.orQuery("bool", {
    filter: {
      bool: {
        must: [
          {
            term: {
              object_type: searchType
            }
          },
          ...extraClauses,
          // Add multimatch text query here to filter out non-matching results
          ...textFilter
        ]
      }
    },
    // Add multimatch text query here again to score results based on match
    ...textQuery
  })
  return builder
}

export const buildChannelQuery = (
  builder: any,
  text: ?string,
  types: Array<string>,
  channelName: ?string
) => {
  for (const type of types) {
    const textQuery = emptyOrNil(text)
      ? {}
      : {
        should: [
          {
            multi_match: {
              query:  text,
              fields: searchFields(type)
            }
          }
        ].filter(clause => clause !== null)
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

    builder = buildOrQuery(builder, type, textQuery, channelClauses)
  }

  if (!emptyOrNil(text)) {
    builder = builder.rawOption(
      "suggest",
      // $FlowFixMe: if we get this far, text is not null
      buildSuggestQuery(text, CHANNEL_SUGGEST_FIELDS)
    )
  }

  return builder.build()
}

export const buildLearnQuery = (
  builder: any,
  text: ?string,
  types: Array<string>,
  facets: ?Map<string, Array<string>>
) => {
  for (const type of types) {
    const queryType = isDoubleQuoted(text) ? "query_string" : "multi_match"
    const textQuery = emptyOrNil(text)
      ? {}
      : {
        should: [
          {
            [queryType]: {
              query:  text,
              fields: searchFields(type)
            }
          },
          [LR_TYPE_BOOTCAMP, LR_TYPE_COURSE, LR_TYPE_PROGRAM].includes(type)
            ? {
              nested: {
                path:  "runs",
                query: {
                  [queryType]: {
                    query:  text,
                    fields: RESOURCE_QUERY_NESTED_FIELDS
                  }
                }
              }
            }
            : null,
          type === LR_TYPE_COURSE && SETTINGS.file_search_enabled
            ? {
              has_child: {
                type:  "resourcefile",
                query: {
                  [queryType]: {
                    query:  text,
                    fields: ["content", "title", "short_description"]
                  }
                },
                score_mode: "avg"
              }
            }
            : null
        ].filter(clause => clause !== null)
      }

    // Add filters for facets if necessary
    const facetClauses = buildFacetSubQuery(facets, builder)
    builder = buildOrQuery(builder, type, textQuery, facetClauses)

    // Include suggest if search test is not null/empty
    if (!emptyOrNil(text)) {
      builder = builder.rawOption(
        "suggest",
        // $FlowFixMe: if we get this far, text is not null
        buildSuggestQuery(text, LEARN_SUGGEST_FIELDS)
      )
    } else if (facetClauses.length === 0 && R.equals(types, LR_TYPE_ALL)) {
      builder = builder.rawOption("sort", buildDefaultSort())
    }
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
