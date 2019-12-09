// @flow
import R from "ramda"
import { createSelector } from "reselect"

import {
  featuredCoursesURL,
  upcomingCoursesURL,
  newCoursesURL,
  courseDetailApiURL
} from "../url"
import { DEFAULT_POST_OPTIONS } from "../redux_query"
import { constructIdMap } from "../redux_query"

import type { Course } from "../../flow/discussionTypes"

export const courseRequest = (courseId: number) => ({
  queryKey:  `courseRequest${courseId}`,
  url:       courseDetailApiURL.param({ courseId }).toString(),
  transform: (course: any) => ({
    courses: { [course.id]: course }
  }),
  update: {
    courses: R.merge
  }
})

export const coursesSelector = createSelector(
  state => state.entities.courses,
  courses => courses
)

const courseListSelector = listName =>
  createSelector(
    state => state.entities.courses,
    state => state.entities[listName],
    (courseMap, list) =>
      list && courseMap ? list.map(id => courseMap[id]) : null
  )

export const courseListRequestFactory = (
  courseListURL: string,
  courseListKey: string
) => [
  () => ({
    url:       courseListURL,
    transform: (responseJson: Object) => {
      const { next, results } = responseJson

      return {
        courses:                  constructIdMap(results),
        [courseListKey]:          results.map(result => result.id),
        [`${courseListKey}Next`]: next
      }
    },
    update: {
      courses:                  R.merge,
      [courseListKey]:          (prev, next) => next,
      [`${courseListKey}Next`]: (prev, next) => next
    }
  }),
  courseListSelector(courseListKey)
]

const featuredCoursesKey = "featuredCourses"
export const [
  featuredCoursesRequest,
  featuredCoursesSelector
] = courseListRequestFactory(featuredCoursesURL, featuredCoursesKey)

const upcomingCoursesKey = "upcomingCourses"
export const [
  upcomingCoursesRequest,
  upcomingCoursesSelector
] = courseListRequestFactory(upcomingCoursesURL, upcomingCoursesKey)

const newCoursesKey = "newCourses"
export const [newCoursesRequest, newCoursesSelector] = courseListRequestFactory(
  newCoursesURL,
  newCoursesKey
)

export const favoriteCourseMutation = (course: Course) => ({
  queryKey: "courseMutation",
  url:      `${courseDetailApiURL.param({ courseId: course.id }).toString()}${
    course.is_favorite ? "unfavorite" : "favorite"
  }/`,
  transform: () => {
    const updatedCourse = {
      ...course,
      is_favorite: !course.is_favorite
    }

    return {
      courses: {
        [updatedCourse.id]: updatedCourse
      }
    }
  },
  update: {
    courses: R.mergeDeepRight
  },
  options: {
    method: "POST",
    ...DEFAULT_POST_OPTIONS
  }
})
