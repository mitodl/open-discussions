// @flow
import R from "ramda"

import { fetchJSONWithAuthFailure } from "./fetch_auth"

import type { Course } from "../../flow/discussionTypes"

export function getCourse(courseId: number): Promise<Course> {
  return fetchJSONWithAuthFailure(`/api/v0/courses/${courseId}/`)
}

export const nextUpdate = (prev: string, next: string) => next
export const courseArrayUpdate = (prev: Array<Course>, next: Array<Course>) =>
  next

export const featuredCoursesSelector = R.pathOr(null, [
  "entities",
  "featuredCourses"
])
export const featuredCoursesRequest = () => ({
  url:       "/api/v0/courses/featured",
  transform: (responseJson: Object) => {
    const { next, results } = responseJson

    return {
      featuredCourses:     results,
      featuredCoursesNext: next
    }
  },
  update: {
    featuredCourses:     courseArrayUpdate,
    featuredCoursesNext: nextUpdate
  }
})

export const upcomingCoursesSelector = R.pathOr(null, [
  "entities",
  "upcomingCourses"
])
export const upcomingCoursesRequest = () => ({
  url:       "/api/v0/courses/upcoming",
  transform: (responseJson: Object) => {
    const { next, results } = responseJson

    return {
      upcomingCourses:     results,
      upcomingCoursesNext: next
    }
  },
  update: {
    upcomingCourses:     courseArrayUpdate,
    upcomingCoursesNext: nextUpdate
  }
})

export const newCoursesSelector = R.pathOr(null, ["entities", "newCourses"])
export const newCoursesRequest = () => ({
  url:       "/api/v0/courses/new",
  transform: (responseJson: Object) => {
    const { next, results } = responseJson

    return {
      newCourses:     results,
      newCoursesNext: next
    }
  },
  update: {
    newCourses:     courseArrayUpdate,
    newCoursesNext: nextUpdate
  }
})
