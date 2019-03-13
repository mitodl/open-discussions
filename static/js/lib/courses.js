//@flow
import moment from "moment"
import _ from "lodash"

import type { Course } from "../flow/discussionTypes"
import {
  platforms,
  COURSE_AVAILABLE_NOW,
  COURSE_PRIOR,
  COURSE_UPCOMING
} from "./constants"

export const courseAvailability = (course: Course) =>
  course.platform === platforms.OCW
    ? COURSE_AVAILABLE_NOW
    : moment(course.start_date).isAfter(moment())
      ? _.capitalize(COURSE_UPCOMING)
      : moment(course.end_date).isBefore(moment())
        ? _.capitalize(COURSE_PRIOR)
        : COURSE_AVAILABLE_NOW

export const maxPrice = (course: Course) => {
  const price = Math.max(...course.prices.map(price => price.price))
  return price > 0 ? `$${price}` : "Free"
}

export const minPrice = (course: Course) => {
  const price = Math.min(...course.prices.map(price => price.price))
  return price > 0 && price !== Infinity ? `$${price}` : "Free"
}
