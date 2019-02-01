// @flow
import { createAction } from "redux-actions"

export const SET_POST_DATA = "SET_POST_DATA"
export const setPostData = createAction<string, *>(SET_POST_DATA)

export const CLEAR_POST_ERROR = "CLEAR_POST_ERROR"
export const clearPostError = createAction<string, *>(CLEAR_POST_ERROR)
