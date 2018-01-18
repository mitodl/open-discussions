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

export const VALID_SORT_LABELS = [
  [POSTS_SORT_HOT, "active"],
  [POSTS_SORT_TOP, "top"],
  [POSTS_SORT_NEW, "new"]
]

export const updateSortParam = R.curry((props, e) => {
  const { history, location: { pathname, search } } = props
  const { target: { value } } = e

  e.preventDefault()

  if (R.contains(value, VALID_POST_SORT_TYPES)) {
    history.push({
      pathname: pathname,
      search:   qs.stringify(Object.assign({}, qs.parse(search), { sort: value }))
    })
  }
})
