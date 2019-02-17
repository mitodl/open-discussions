// @flow
import { GET, INITIAL_STATE } from "redux-hammock/constants"
import * as api from "../lib/api/api"
import type { Course } from "../flow/discussionTypes"
import * as courseAPI from "../lib/api/courses"
import R from "ramda"
import { CLEAR_COURSE_ERROR, SET_COURSE_DATA } from "../actions/course"

export const courseFacetsEndpoint = {
  name:              "coursefacets",
  verbs:             [GET],
  initialState:      { ...INITIAL_STATE, data: new Map() },
  getFunc:           () => api.aggregate(["topics", "platform"]),
  getSuccessHandler: (response: Object): any => {
    return {
      topics:    response.aggregations.topics.buckets.map(topic => topic.key),
      platforms: response.aggregations.platform.buckets.map(
        platform => platform.key
      )
    }
  }
}

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
  getSuccessHandler: updateCourseHandler,
  extraActions:      {
    [SET_COURSE_DATA]: (state, action) => {
      const updatedData = new Map(state.data)
      for (const course of action.payload) {
        updatedData.set(course.id, course)
      }

      return {
        ...state,
        data: updatedData
      }
    },
    [CLEAR_COURSE_ERROR]: R.dissoc("error")
  }
}
