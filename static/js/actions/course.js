// @flow
import { createAction } from "redux-actions"

export const SET_COURSE_DATA = "SET_COURSE_DATA"
export const setCourseData = createAction(SET_COURSE_DATA)

export const CLEAR_COURSE_ERROR = "CLEAR_COURSE_ERROR"
export const clearCourseError = createAction(CLEAR_COURSE_ERROR)
