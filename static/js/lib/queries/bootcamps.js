// @flow
import R from "ramda"

import { bootcampDetailApiURL } from "../url"
import { DEFAULT_POST_OPTIONS } from "../redux_query"

import type { Bootcamp } from "../../flow/discussionTypes"
import { createSelector } from "reselect"

export const bootcampsSelector = createSelector(
  state => state.entities.bootcamps,
  bootcamps => bootcamps
)

export const bootcampRequest = (bootcampId: number) => ({
  queryKey:  `bootcampRequest${bootcampId}`,
  url:       bootcampDetailApiURL.param({ bootcampId }).toString(),
  transform: (bootcamp: any) => ({
    bootcamps: { [bootcamp.id]: bootcamp }
  }),
  update: {
    bootcamps: R.merge
  }
})

export const favoriteBootcampMutation = (bootcamp: Bootcamp) => ({
  queryKey: "bootcampMutation",
  url:      `${bootcampDetailApiURL.param({ bootcampId: bootcamp.id }).toString()}${
    bootcamp.is_favorite ? "unfavorite" : "favorite"
  }/`,
  transform: () => {
    const updatedBootcamp = {
      ...bootcamp,
      is_favorite: !bootcamp.is_favorite
    }

    return {
      bootcamps: {
        [updatedBootcamp.id]: updatedBootcamp
      }
    }
  },
  update: {
    bootcamps: R.mergeDeepRight
  },
  options: {
    method: "POST",
    ...DEFAULT_POST_OPTIONS
  }
})
