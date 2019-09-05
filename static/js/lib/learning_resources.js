//@flow
import { concat, isNil } from "ramda"
import moment from "moment"

import {
  COURSE_ARCHIVED,
  COURSE_AVAILABLE_NOW,
  COURSE_CURRENT,
  COURSE_PRIOR,
  DATE_FORMAT,
  LR_TYPE_USERLIST
} from "./constants"
import { AVAILABILITY_MAPPING, AVAILABLE_NOW } from "./search"
import { capitalize, emptyOrNil } from "./util"
import type { CourseRun } from "../flow/discussionTypes"

const defaultStartDate = "1970-01-01T00:00:00Z"
const defaultEndDate = "2500-01-01T00:00:00Z"

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

export const availabilityFilterToMoment = (filter: string) => {
  // Convert an Elasticsearch date_range filter string to a moment
  const format = /(now)(\+)?(\d+)?([Md])?/
  const match = format.exec(filter)
  if (match) {
    let dt = moment()
    if (match[3] && match[4]) {
      dt = dt.add(match[3], match[4] === "d" ? "days" : "months")
    }
    return dt
  }
}

export const inDateRanges = (run: CourseRun, availabilities: Array<string>) => {
  let inRange = false
  availabilities.forEach(availability => {
    if (AVAILABILITY_MAPPING[availability]) {
      const from = availabilityFilterToMoment(
        AVAILABILITY_MAPPING[availability].filter.from
      )
      const to = availabilityFilterToMoment(
        AVAILABILITY_MAPPING[availability].filter.to
      )
      const startDate = runStartDate(run)
      if (
        (isNil(from) ||
          // $FlowFixMe: if we get this far, only moments are compared
          startDate.isSameOrAfter(from)) &&
        (isNil(to) ||
          // $FlowFixMe: if we get this far, only moments are compared
          startDate.isSameOrBefore(to))
      ) {
        inRange = true
      }
    }
  })
  return inRange
}

export const bestRunLabel = (run: ?CourseRun) => {
  if (!run) {
    return AVAILABILITY_MAPPING[AVAILABLE_NOW].label
  }
  for (const range in AVAILABILITY_MAPPING) {
    if (inDateRanges(run, [range])) {
      return AVAILABILITY_MAPPING[range].label
    }
  }
}

const runStartDate = (courseRun: CourseRun) =>
  moment(courseRun.best_start_date || defaultStartDate, DATE_FORMAT)
const runEndDate = (courseRun: CourseRun) =>
  moment(courseRun.best_end_date || defaultEndDate, DATE_FORMAT)

export const compareRuns = (firstRun: CourseRun, secondRun: CourseRun) =>
  runStartDate(firstRun).diff(runStartDate(secondRun), "hours")

export const bestRun = (runs: Array<CourseRun>) => {
  const now = moment()

  // Runs that are running right now
  const currentRuns = runs.filter(
    run => runStartDate(run).isSameOrBefore(now) && runEndDate(run).isAfter(now)
  )
  if (!emptyOrNil(currentRuns)) {
    return currentRuns[0]
  }

  // The next future run
  const futureRuns = runs
    .filter(run => runStartDate(run).isAfter(now))
    .sort(compareRuns)
  if (!emptyOrNil(futureRuns)) {
    return futureRuns[0]
  }

  // The most recent run that "ended"
  const mostRecentRuns = runs
    .filter(run => runStartDate(run).isSameOrBefore(now))
    .sort(compareRuns)
    .reverse()
  if (!emptyOrNil(mostRecentRuns)) {
    return mostRecentRuns[0]
  }
  return null
}

export const filterRunsByAvailability = (
  runs: ?Array<CourseRun>,
  availabilities: ?Array<string>
) =>
  runs
    ? // $FlowFixMe
    runs.filter(
      run => (availabilities ? inDateRanges(run, availabilities) : true)
    )
    : []

export const resourceLabel = (resource: string) => {
  return resource === LR_TYPE_USERLIST
    ? "Learning Paths"
    : concat(capitalize(resource), "s")
}

export const maxPrice = (courseRun: ?CourseRun) => {
  const prices = courseRun && courseRun.prices ? courseRun.prices : []
  const price = Math.max(...prices.map(price => price.price))
  return price > 0 ? `$${price}` : "Free"
}

export const minPrice = (courseRun: ?CourseRun) => {
  const prices = courseRun && courseRun.prices ? courseRun.prices : []
  const price = Math.min(...prices.map(price => price.price))
  return price > 0 && price !== Infinity ? `$${price}` : "Free"
}
