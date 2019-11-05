// @flow
import R from "ramda"
import { createSelector } from "reselect"

import { favoritesURL } from "../url"
import { constructIdMap } from "../redux_query"
import {
  LR_TYPE_COURSE,
  LR_TYPE_BOOTCAMP,
  LR_TYPE_PROGRAM,
  LR_TYPE_USERLIST,
  LR_TYPE_VIDEO,
  LR_TYPE_LEARNINGPATH
} from "../constants"
import { querySelectors } from "redux-query"
import { courseRequest } from "./courses"
import { bootcampRequest } from "./bootcamps"
import { programRequest } from "./programs"
import { videoRequest } from "./videos"
import { userListRequest } from "./user_lists"

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
      videos:    constructIdMap(filterFavorites(results, LR_TYPE_VIDEO)),
      next:      next
    }
  },
  update: {
    courses:   R.merge,
    bootcamps: R.merge,
    programs:  R.merge,
    userLists: R.merge,
    videos:    R.merge,
    next:      (prev: string, next: string) => next
  }
})

const filterFavorite = (entities: Object) =>
  R.filter(R.propEq("is_favorite", true), entities || {})

export const favoritesSelector = createSelector(
  state => state.entities.courses,
  state => state.entities.bootcamps,
  state => state.entities.programs,
  state => state.entities.userLists,
  state => state.entities.videos,
  (courses, bootcamps, programs, userLists, videos) => ({
    courses:   filterFavorite(courses),
    bootcamps: filterFavorite(bootcamps),
    programs:  filterFavorite(programs),
    userLists: filterFavorite(userLists),
    videos:    filterFavorite(videos)
  })
)

export const getQuerySelector = (state: Object, object: Object) => {
  return createSelector(
    state => state.ui,
    state => state.entities.courses,
    state => state.entities.bootcamps,
    state => state.entities.programs,
    state => state.entities.userLists,
    state => state.entities.videos,
    state => state.queries,
    (ui, courses, bootcamps, programs, userLists, videos, queries) => {
      if (object && object.object_type) {
        switch (object.object_type) {
        case LR_TYPE_COURSE:
          return querySelectors.isFinished(queries, courseRequest(object.id))
            ? courses[object.id]
            : null
        case LR_TYPE_BOOTCAMP:
          return querySelectors.isFinished(
            queries,
            bootcampRequest(object.id)
          )
            ? bootcamps[object.id]
            : null
        case LR_TYPE_PROGRAM:
          return querySelectors.isFinished(queries, programRequest(object.id))
            ? programs[object.id]
            : null
        case LR_TYPE_VIDEO:
          return querySelectors.isFinished(queries, videoRequest(object.id))
            ? videos[object.id]
            : null
        case LR_TYPE_USERLIST:
          return querySelectors.isFinished(
            queries,
            userListRequest(object.id)
          )
            ? userLists[object.id]
            : null
        case LR_TYPE_LEARNINGPATH:
          return querySelectors.isFinished(
            queries,
            userListRequest(object.id)
          )
            ? userLists[object.id]
            : null
        }
      }
      return null
    }
  )
}
