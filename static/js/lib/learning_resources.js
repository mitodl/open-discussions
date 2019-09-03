//@flow
import { concat, isNil } from "ramda"

import {
  COURSE_ARCHIVED,
  COURSE_AVAILABLE_NOW,
  COURSE_CURRENT,
  COURSE_PRIOR,
  LR_TYPE_USERLIST
} from "./constants"
import { capitalize, emptyOrNil } from "./util"
import { AVAILABILITY_MAPPING, AVAILABLE_NOW } from "./search"
import moment, {Moment} from "moment"
import { dateFormat } from "../factories/learning_resources"
import type { CourseRun } from "../flow/discussionTypes"

const defaultStartDate = moment("1970-01-01T00:00:00Z", dateFormat)
const defaultEndDate = moment("2500-01-01T00:00:00Z", dateFormat)

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

export const parseDateFilter = (filter: string) => {
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
      const from = parseDateFilter(
        AVAILABILITY_MAPPING[availability].filter.from
      )
      const to = parseDateFilter(AVAILABILITY_MAPPING[availability].filter.to)
      const start_date = run.best_start_date
        ? moment(run.best_start_date, dateFormat)
        : null
      if (
        ((isNil(start_date) && availability === AVAILABLE_NOW) ||
          isNil(from) ||
          // $FlowFixMe: okay to compare moments
          start_date >= from) &&
        ((isNil(start_date) && availability === AVAILABLE_NOW) ||
          isNil(to) ||
          // $FlowFixMe: okay to compare moments
          start_date <= to)
      ) {
        inRange = true
      }
    }
  })
  return inRange
}

export const bestRunLabel = (run: CourseRun) => {
  if (!run) {
    return AVAILABILITY_MAPPING[AVAILABLE_NOW].label
  }
  for (const range in AVAILABILITY_MAPPING) {
    if (inDateRanges(run, [range])) {
      return AVAILABILITY_MAPPING[range].label
    }
  }
}

export const dateOrDefault = (dateString:?string, dateDefault: Moment) =>
  dateString ? moment(dateString, dateFormat) : dateDefault

export const compareRuns = (firstRun: CourseRun, secondRun: CourseRun) =>
  (moment(firstRun.best_start_date, dateFormat) || defaultStartDate).diff(
  (moment(secondRun.best_start_date, dateFormat) || defaultStartDate), "hours")

export const bestRun = (runs: Array<CourseRun>) => {
  const now = moment()

  // Runs that are running right now
  const currentRuns = runs.filter(
    run =>
      dateOrDefault(run.best_start_date, defaultStartDate).diff(now) <= 0 &&
      dateOrDefault(run.best_end_date, defaultEndDate).diff(now) > 0
  )
  if (!emptyOrNil(currentRuns)) {
    return currentRuns[0]
  }

  // The next future run
  const futureRuns = runs
    .filter(run => dateOrDefault(run.best_start_date, defaultStartDate).diff(now) > 0)
    .sort(compareRuns)
  if (!emptyOrNil(futureRuns)) {
    return futureRuns[0]
  }

  // The most recent run that "ended"
  const mostRecentRuns = runs
    .filter(run => dateOrDefault(run.best_start_date, defaultStartDate).diff(now) <=0)
    .sort(compareRuns)
    .reverse()
  if (!emptyOrNil(mostRecentRuns)) {
    return mostRecentRuns[0]
  }
}

export const filterRunsByAvailability = (runs: Array<CourseRun>, availabilities: ?Array<string>) =>
  runs.filter(
    run => (availabilities ? inDateRanges(run, availabilities) : true)
  )

export const resourceLabel = (resource: string) => {
  return resource === LR_TYPE_USERLIST
    ? "Learning Paths"
    : concat(capitalize(resource), "s")
}

export const maxPrice = (courseRun: CourseRun) => {
  const prices = !emptyOrNil(courseRun) ? courseRun.prices : []
  const price = Math.max(...prices.map(price => price.price))
  return price > 0 ? `$${price}` : "Free"
}

export const minPrice = (courseRun: CourseRun) => {
  const prices = !emptyOrNil(courseRun) ? courseRun.prices : []
  const price = Math.min(...prices.map(price => price.price))
  return price > 0 && price !== Infinity ? `$${price}` : "Free"
}
