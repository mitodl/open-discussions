//@flow
import moment from "moment"
import R from "ramda"
import _ from "lodash"

import type { Course } from "../flow/discussionTypes"
import {
  platforms,
  COURSE_AVAILABLE_NOW,
  COURSE_PRIOR,
  COURSE_UPCOMING,
  COURSE_CURRENT
} from "./constants"

export const courseAvailability = (course: Course, isFacet: boolean) =>
  course.platform === platforms.OCW
    ? isFacet
      ? COURSE_CURRENT
      : COURSE_AVAILABLE_NOW
    : moment(course.start_date).isAfter(moment())
      ? isFacet
        ? COURSE_UPCOMING
        : _.capitalize(COURSE_UPCOMING)
      : moment(course.end_date).isBefore(moment())
        ? isFacet
          ? COURSE_PRIOR
          : _.capitalize(COURSE_PRIOR)
        : isFacet
          ? COURSE_CURRENT
          : COURSE_AVAILABLE_NOW

export const maxPrice = (course: Course) => {
  const price = Math.max(...R.map(R.view(R.lensProp("price")), course.prices))
  return price > 0 ? `$${price}` : "Free"
}
