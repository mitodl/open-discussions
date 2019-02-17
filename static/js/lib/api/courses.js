// @flow
import { fetchJSONWithAuthFailure } from "./fetch_auth"
import type { Course } from "../../flow/discussionTypes"

export function getCourse(courseId: number): Promise<Course> {
  return fetchJSONWithAuthFailure(`/api/v0/courses/${courseId}/`)
}
