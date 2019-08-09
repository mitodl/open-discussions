// @flow
import R from "ramda"

import { favoritesURL } from "../url"
import { constructIdMap } from "../redux_query"
import {
  LR_TYPE_COURSE,
  LR_TYPE_BOOTCAMP,
  LR_TYPE_USERLIST,
  LR_TYPE_PROGRAM
} from "../constants"

export const filterFavorites = (
  results: Array<Object>,
  contentType: string
): Array<Object> =>
  results
    .filter(result => result.content_data !== null)
    .filter(result => result.content_type === contentType)
    .map(result => result.content_data)

export const favoritesRequest = () => ({
  url:       favoritesURL,
  transform: (responseJson: Object) => {
    const { next, results } = responseJson

    const foo = {
      courses:   constructIdMap(filterFavorites(results, LR_TYPE_COURSE)),
      bootcamps: constructIdMap(filterFavorites(results, LR_TYPE_BOOTCAMP)),
      programs:  constructIdMap(filterFavorites(results, LR_TYPE_PROGRAM)),
      userLists: constructIdMap(filterFavorites(results, LR_TYPE_USERLIST)),
      next:      next
    }
    return foo
  },
  update: {
    courses:   R.merge,
    bootcamps: R.merge,
    programs:  R.merge,
    userLists: R.merge,
    next:      (prev: string, next: string) => next
  }
})
