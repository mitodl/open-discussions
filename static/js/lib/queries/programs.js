// @flow
import R from "ramda"
import { memoize } from "lodash"

import { programURL } from "../url"
import { DEFAULT_POST_OPTIONS } from "../redux_query"

import type { Program } from "../../flow/discussionTypes"
import { createSelector } from "reselect"

export const programsSelector = createSelector(
  state => state.entities.programs,
  programs => programs
)

export const programSelector = createSelector(programsSelector, programs =>
  memoize(programID => (programs ? programs[programID] : null))
)

export const programRequest = (programId: number) => ({
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
