// @flow
import { createAction } from "redux-actions"

export const CLEAR_SEARCH = "CLEAR_SEARCH"
export const clearSearch = createAction<string, *>(CLEAR_SEARCH)

export const SET_SEARCH_INCREMENTAL = "SET_SEARCH_INCREMENTAL"
export const setSearchIncremental = createAction<string, *>(
  SET_SEARCH_INCREMENTAL
)
