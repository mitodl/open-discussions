//@flow
import { concat } from "ramda"

import {
  COURSE_ARCHIVED,
  COURSE_AVAILABLE_NOW,
  COURSE_CURRENT,
  COURSE_PRIOR,
  LR_TYPE_USERLIST
} from "./constants"
import { capitalize, emptyOrNil } from "./util"
import { AVAILABILITY_MAPPING } from "./search"
import moment from "moment"

export const availabilityFacetLabel = (availability: ?string) => {
  const facetKey = availability ? AVAILABILITY_MAPPING[availability] : null
  return facetKey ? facetKey.label : availability
}

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

export const sortedAvailabilities = (availabilities: Array<string>) => (
  availabilities.sort((a,b) => AVAILABILITY_MAPPING[a] && AVAILABILITY_MAPPING[b]
    ? AVAILABILITY_MAPPING[a].order - AVAILABILITY_MAPPING[b].order
    : 1))

export const inDateRanges = (run: CourseRun, availabilities: Array<string>) => {
  availabilities.forEach()
}

export const filterRunsByAvailability = (runs, availabilities) => (
  runs.filter((run) => inDateRanges(run, availabilities))
)

export const resourceLabel = (resource: string) => {
  return resource === LR_TYPE_USERLIST
    ? "Learning Paths"
    : concat(capitalize(resource), "s")
}

export const maxPrice = (resource: Object) => {
  const prices = !emptyOrNil(resource.course_runs)
    ? resource.course_runs[0].prices
    : []
  const price = Math.max(...prices.map(price => price.price))
  return price > 0 ? `$${price}` : "Free"
}

export const minPrice = (resource: Object) => {
  const prices = !emptyOrNil(resource.course_runs)
    ? resource.course_runs[0].prices
    : []
  const price = Math.min(...prices.map(price => price.price))
  return price > 0 && price !== Infinity ? `$${price}` : "Free"
}
