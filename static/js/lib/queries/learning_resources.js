// @flow
import R from "ramda"
import { renameKeys } from "ramda-adjunct"
import { createSelector } from "reselect"
import { memoize } from "lodash"

import { favoritesURL, similarResourcesURL } from "../url"
import { constructIdMap, DEFAULT_POST_OPTIONS } from "../redux_query"
import {
  LR_TYPE_COURSE,
  LR_TYPE_BOOTCAMP,
  LR_TYPE_PROGRAM,
  LR_TYPE_USERLIST,
  LR_TYPE_VIDEO,
  LR_TYPE_LEARNINGPATH
} from "../constants"
import { courseRequest } from "./courses"
import { bootcampRequest } from "./bootcamps"
import { programRequest } from "./programs"
import { videoRequest } from "./videos"
import { userListRequest } from "./user_lists"

// object_type => $KEY for `entities.$KEY` mapping
export const OBJECT_TYPE_ENTITY_ROUTING = {
  [LR_TYPE_USERLIST]:     "userLists",
  [LR_TYPE_LEARNINGPATH]: "userLists",
  [LR_TYPE_COURSE]:       "courses",
  [LR_TYPE_BOOTCAMP]:     "bootcamps",
  [LR_TYPE_PROGRAM]:      "programs",
  [LR_TYPE_VIDEO]:        "videos"
}

export const normalizeResourcesByObjectType = R.compose(
  R.map(constructIdMap),
  renameKeys(OBJECT_TYPE_ENTITY_ROUTING),
  R.groupBy(R.prop("object_type"))
)

export const updateLearningResources = {
  courses:   R.merge,
  bootcamps: R.merge,
  programs:  R.merge,
  userLists: R.merge,
  videos:    R.merge
}

export const mapResourcesToResourceRefs = R.map(
  R.compose(
    renameKeys({
      id:          "object_id",
      object_type: "content_type"
    }),
    R.pick(["id", "object_type"])
  )
)

export const filterObjectType = (
  results: Array<Object>,
  objectType: string
): Array<Object> => results.filter(result => result.object_type === objectType)

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
    ...updateLearningResources,
    next: (prev: string, next: string) => next
  }
})

export const similarResourcesRequest = (object: any) => ({
  queryKey: `similarResourceRequest_${object.object_type}_${object.id}`,
  body:     {
    title:             object.title,
    short_description: object.short_description,
    id:                object.id,
    object_type:       object.object_type
  },
  url:       similarResourcesURL,
  transform: (results: any) => ({
    similarResources: { [`${object.object_type}_${object.id}`]: results }
  }),
  update: {
    similarResources: R.merge
  },
  options: {
    method: "POST",
    ...DEFAULT_POST_OPTIONS
  }
})

export const getSimilarResources = createSelector(
  state => state.entities.similarResources,
  similarResources => similarResources
)

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
    memoize(
      (objectId, objectType) => {
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
      },
      // by default `_.memoize` only uses the first argument of the function it
      // wraps as a cache key. since the first arg is the object ID, if we had
      // two objects with the same ID but a different type we could return the
      // wrong object.
      //
      // We're avoiding this by passing a function to `memoize` to create a
      // custom cache key that takes the id and type in to account
      (id, type) => `${id}_${type}`
    )
)
