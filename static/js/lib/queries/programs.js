// @flow
import R from "ramda"

import { programURL } from "../url"
import { DEFAULT_POST_OPTIONS } from "../redux_query"

import type { Program } from "../../flow/discussionTypes"

export const programRequest = (programId: string) => ({
  queryKey:  `programRequest${programId}`,
  url:       `${programURL}/${programId}/`,
  transform: (program: any) => ({
    programs: { [program.id]: program }
  }),
  update: {
    programs: R.merge
  }
})

export const favoriteProgramMutation = (program: Program) => ({
  queryKey: "programMutation",
  body:     program,
  url:      `${programURL}/${program.id}/${
    program.is_favorite ? "unfavorite" : "favorite"
  }/`,
  transform: () => {
    const updatedprogram = {
      ...program,
      is_favorite: !program.is_favorite
    }

    return {
      programs: {
        [updatedprogram.id]: updatedprogram
      }
    }
  },
  update: {
    programs: R.mergeDeepRight
  },
  options: {
    method: "POST",
    ...DEFAULT_POST_OPTIONS
  }
})
