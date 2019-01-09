// @flow
import R from "ramda"

import { toQueryString } from "../url"
import { getPaginationSortParams } from "../posts"

const paramsToQueryString = paramSelector =>
  R.compose(
    toQueryString,
    R.reject(R.isNil),
    paramSelector
  )

export const getPaginationSortQS = paramsToQueryString(getPaginationSortParams)

export const getCommentSortQS = paramsToQueryString(R.pickAll(["sort"]))
