//@flow
import { concat } from "ramda"
import {
  COURSE_ARCHIVED,
  COURSE_AVAILABLE_NOW,
  COURSE_CURRENT,
  COURSE_PRIOR
} from "./constants"

import type {
  Bootcamp,
  Course,
  LearningResource
} from "../flow/discussionTypes"
import { capitalize } from "./util"

export const availabilityLabel = (availability: ?string) => {
  switch (availability) {
  case COURSE_CURRENT:
    return COURSE_AVAILABLE_NOW
  case COURSE_ARCHIVED:
    return COURSE_PRIOR
  default:
    return availability
  }
}

export const resourceLabel = (resource: string) => {
  return concat(capitalize(resource), "s")
}

export const maxPrice = (course: Course | Bootcamp) => {
  const price = Math.max(...course.prices.map(price => price.price))
  return price > 0 ? `$${price}` : "Free"
}

export const minPrice = (course: LearningResource | Course | Bootcamp) => {
  const price = Math.min(...course.prices.map(price => price.price))
  return price > 0 && price !== Infinity ? `$${price}` : "Free"
}
