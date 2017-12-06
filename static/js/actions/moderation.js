// @flow
import { createAction } from "redux-actions"

export const SET_MODERATING_COMMENT = "SET_MODERATING_COMMENT"
export const setModeratingComment = createAction(SET_MODERATING_COMMENT)

export const CLEAR_MODERATING_COMMENT = "CLEAR_MODERATING_COMMENT"
export const clearModeratingComment = createAction(CLEAR_MODERATING_COMMENT)
