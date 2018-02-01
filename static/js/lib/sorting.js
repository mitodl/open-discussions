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
  [POSTS_SORT_HOT, "active"],
  [POSTS_SORT_TOP, "top"],
  [POSTS_SORT_NEW, "new"]
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

const updateSortParam = R.curry((validSortTypes, props, e) => {
  const { history, location: { pathname, search } } = props
  const { target: { value } } = e

  e.preventDefault()

  if (R.contains(value, validSortTypes)) {
    history.push({
      pathname: pathname,
      search:   qs.stringify(Object.assign({}, qs.parse(search), { sort: value }))
    })
  }
})

export const updatePostSortParam = updateSortParam(VALID_POST_SORT_TYPES)

export const updateCommentSortParam = updateSortParam(VALID_COMMENT_SORT_TYPES)
