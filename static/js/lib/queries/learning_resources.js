// @flow
import R from "ramda"
import { createSelector } from "reselect"
import { memoize } from "lodash"

import { favoritesURL } from "../url"
import { constructIdMap } from "../redux_query"
import {
  LR_TYPE_COURSE,
  LR_TYPE_BOOTCAMP,
  LR_TYPE_PROGRAM,
  LR_TYPE_USERLIST,
  LR_TYPE_VIDEO
} from "../constants"
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

export const favoritesListSelector = createSelector(
  favoritesSelector,
  ({ courses, bootcamps, programs, userLists, videos }) => [
    ...Object.values(courses),
    ...Object.values(bootcamps),
    ...Object.values(programs),
    ...Object.values(userLists),
    ...Object.values(videos)
  ]
)

export const getResourceRequest = (objectId: ?number, objectType: ?string) => {
  if (!objectId) {
    return null
  }

  switch (objectType) {
  case LR_TYPE_COURSE:
    return courseRequest(objectId)
  case LR_TYPE_BOOTCAMP:
    return bootcampRequest(objectId)
  case LR_TYPE_PROGRAM:
    return programRequest(objectId)
  case LR_TYPE_VIDEO:
    return videoRequest(objectId)
  default:
    return userListRequest(objectId)
  }
}

export const learningResourceSelector = createSelector(
  state => state.entities.courses,
  state => state.entities.bootcamps,
  state => state.entities.programs,
  state => state.entities.userLists,
  state => state.entities.videos,
  (courses, bootcamps, programs, userLists, videos) =>
    memoize((objectId, objectType) => {
      switch (objectType) {
      case LR_TYPE_COURSE:
        return courses ? courses[objectId] : null
      case LR_TYPE_BOOTCAMP:
        return bootcamps ? bootcamps[objectId] : null
      case LR_TYPE_PROGRAM:
        return programs ? programs[objectId] : null
      case LR_TYPE_VIDEO:
        return videos ? videos[objectId] : null
      default:
        return userLists ? userLists[objectId] : null
      }
    })
)
