// @flow
import { GET, INITIAL_STATE } from "redux-hammock/constants"
import type { Course } from "../flow/discussionTypes"
import * as courseAPI from "../lib/api/courses"

const updateCourseHandler = (
  payload: Course,
  data: Map<number, Course>
): Map<number, Course> => {
  const update = new Map(data)
  update.set(payload.id, payload)
  return update
}

export const coursesEndpoint = {
  name:              "courses",
  verbs:             [GET],
  initialState:      { ...INITIAL_STATE, data: new Map() },
  getFunc:           (id: number) => courseAPI.getCourse(id),
  getSuccessHandler: updateCourseHandler
}
