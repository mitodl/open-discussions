// @flow
import R from "ramda"

import { bootcampURL } from "../url"
import { DEFAULT_POST_OPTIONS } from "../redux_query"

import type { Bootcamp } from "../../flow/discussionTypes"

export const bootcampRequest = (bootcampId: string) => ({
  queryKey:  `bootcampRequest${bootcampId}`,
  url:       `${bootcampURL}/${bootcampId}/`,
  transform: (bootcamp: Bootcamp) => ({
    bootcamps: { [bootcamp.id]: bootcamp }
  }),
  update: {
    bootcamps: R.merge
  }
})

export const favoriteBootcampMutation = (bootcamp: Bootcamp) => ({
  queryKey: "bootcampMutation",
  body:     bootcamp,
  url:      `${bootcampURL}/${bootcamp.id}/${
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
