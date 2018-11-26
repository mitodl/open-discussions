// @flow
import R from "ramda"
import qs from "query-string"

export const POSTS_SORT_HOT = "hot"
export const POSTS_SORT_TOP = "top"
export const POSTS_SORT_NEW = "new"

export const VALID_POST_SORT_TYPES = [
  POSTS_SORT_HOT,
  POSTS_SORT_TOP,
  POSTS_SORT_NEW
]

export const VALID_POST_SORT_LABELS = [
  [POSTS_SORT_HOT, "Active"],
  [POSTS_SORT_TOP, "Top"],
  [POSTS_SORT_NEW, "New"]
]

export const COMMENT_SORT_NEW = "new"
export const COMMENT_SORT_OLD = "old"
export const COMMENT_SORT_BEST = "best"

export const VALID_COMMENT_SORT_TYPES = [
  COMMENT_SORT_NEW,
  COMMENT_SORT_OLD,
  COMMENT_SORT_BEST
]

export const VALID_COMMENT_SORT_LABELS = [
  [COMMENT_SORT_NEW, "New"],
  [COMMENT_SORT_OLD, "Old"],
  [COMMENT_SORT_BEST, "Best"]
]

export const SEARCH_FILTER_ALL = ""
export const SEARCH_FILTER_POST = "post"
export const SEARCH_FILTER_COMMENT = "comment"
export const SEARCH_FILTER_PROFILE = "profile"
export const VALID_SEARCH_FILTER_TYPES = [
  SEARCH_FILTER_ALL,
  SEARCH_FILTER_POST,
  SEARCH_FILTER_COMMENT,
  SEARCH_FILTER_PROFILE
]

export const VALID_SEARCH_FILTER_LABELS = [
  [SEARCH_FILTER_ALL, "All"],
  [SEARCH_FILTER_POST, "Post"],
  [SEARCH_FILTER_COMMENT, "Comment"],
  [SEARCH_FILTER_PROFILE, "Profile"]
]

const updatePickerParam = R.curry(
  (validPickerTypes, fieldName, props, value, e) => {
    const {
      history,
      location: { pathname, search }
    } = props

    e.preventDefault()

    if (R.contains(value, validPickerTypes)) {
      history.push({
        pathname: pathname,
        search:   qs.stringify({
          ...qs.parse(search),
          [fieldName]: value
        })
      })
    }
  }
)

export const updatePostSortParam = updatePickerParam(
  VALID_POST_SORT_TYPES,
  "sort"
)

export const updateCommentSortParam = updatePickerParam(
  VALID_COMMENT_SORT_TYPES,
  "sort"
)

export const updateSearchFilterParam = updatePickerParam(
  VALID_SEARCH_FILTER_TYPES,
  "type"
)
