// @flow
import R from "ramda"
import { createSelector } from "reselect"

import { favoritesURL } from "../url"
import { constructIdMap } from "../redux_query"
import {
  LR_TYPE_COURSE,
  LR_TYPE_BOOTCAMP,
  LR_TYPE_PROGRAM,
  LR_TYPE_USERLIST
} from "../constants"

export const filterFavorites = (
  results: Array<Object>,
  contentType: string
): Array<Object> =>
  results
    .filter(result => result.content_data !== null)
    .filter(result => result.content_type === contentType)
    .map(
      (
        { content_data, content_type } // eslint-disable-line camelcase
      ) => R.merge({ object_type: content_type }, content_data) // eslint-disable-line camelcase
    )

export const favoritesRequest = () => ({
  url:       favoritesURL,
  transform: (responseJson: Object) => {
    const { next, results } = responseJson

    return {
      courses:   constructIdMap(filterFavorites(results, LR_TYPE_COURSE)),
      bootcamps: constructIdMap(filterFavorites(results, LR_TYPE_BOOTCAMP)),
      programs:  constructIdMap(filterFavorites(results, LR_TYPE_PROGRAM)),
      userLists: constructIdMap(filterFavorites(results, LR_TYPE_USERLIST)),
      next:      next
    }
  },
  update: {
    courses:   R.merge,
    bootcamps: R.merge,
    programs:  R.merge,
    userLists: R.merge,
    next:      (prev: string, next: string) => next
  }
})

const filterFavorite = (entities: Object, objectType: string) =>
  R.map(
    object => R.merge({ object_type: objectType }, object),
    R.filter(R.propEq("is_favorite", true), entities || {})
  )

export const favoritesSelector = createSelector(
  state => state.entities.courses,
  state => state.entities.bootcamps,
  state => state.entities.programs,
  state => state.entities.userLists,
  (courses, bootcamps, programs, userLists) => ({
    courses:   filterFavorite(courses, LR_TYPE_COURSE),
    bootcamps: filterFavorite(bootcamps, LR_TYPE_BOOTCAMP),
    programs:  filterFavorite(programs, LR_TYPE_PROGRAM),
    userLists: filterFavorite(userLists, LR_TYPE_USERLIST)
  })
)
