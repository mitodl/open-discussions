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

export function getCookie(name: string): string | null {
  let cookieValue = null

  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";")

    for (let cookie of cookies) {
      cookie = cookie.trim()

      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) === `${name}=`) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1))
        break
      }
    }
  }
  return cookieValue
}
