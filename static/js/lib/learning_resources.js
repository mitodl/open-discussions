//@flow
import { concat, find, equals, head } from "ramda"
import moment from "moment"

import {
  COURSE_ARCHIVED,
  COURSE_AVAILABLE_NOW,
  COURSE_CURRENT,
  COURSE_PRIOR,
  DATE_FORMAT,
  DEFAULT_END_DT,
  DEFAULT_START_DT,
  LR_TYPE_USERLIST,
  LR_TYPE_LEARNINGPATH,
  platforms,
  offeredBys
} from "./constants"
import { AVAILABILITY_MAPPING, AVAILABLE_NOW } from "./search"
import { capitalize, emptyOrNil, formatPrice } from "./util"

import type {
  LearningResourceRun,
  CourseInstructor,
  CoursePrice
} from "../flow/discussionTypes"

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

export const availabilityFilterToMoment = (filter: string, ending: boolean) => {
  // Convert an Elasticsearch date_range filter string to a moment, assuming
  // the filter is defined. For example, 'from' is undefined for 'Available Now'
  // because any start date before today qualifies.
  const format = /(now)(\+)?(\d+)?([Md])?/
  const match = format.exec(filter)
  if (match) {
    let dt = moment()
    if (match[3] && match[4]) {
      dt = dt.add(parseInt(match[3]), match[4] === "d" ? "days" : "months")
    }
    if (ending) {
      dt.set({ hour: 23, minute: 59, second: 59 })
    } else {
      dt.set({ hour: 0, minute: 0, second: 0 })
    }
    return dt
  }
}

export const inDateRanges = (
  run: LearningResourceRun,
  availabilities: Array<string>
) => {
  if (emptyOrNil(availabilities)) {
    return true
  }
  for (const availability of availabilities) {
    if (AVAILABILITY_MAPPING[availability]) {
      const from = availabilityFilterToMoment(
        AVAILABILITY_MAPPING[availability].filter.from,
        false
      )
      const to = availabilityFilterToMoment(
        AVAILABILITY_MAPPING[availability].filter.to,
        true
      )
      const startDate = runStartDate(run)
      if (
        (!from || startDate.isSameOrAfter(from)) &&
        (!to || startDate.isSameOrBefore(to))
      ) {
        return true
      }
    }
  }
  return false
}

export const bestRunLabel = (run: ?LearningResourceRun) => {
  if (!run) {
    return AVAILABILITY_MAPPING[AVAILABLE_NOW].label
  }
  for (const range in AVAILABILITY_MAPPING) {
    if (inDateRanges(run, [range])) {
      return AVAILABILITY_MAPPING[range].label
    }
  }
}

export const runStartDate = (objectRun: LearningResourceRun): moment$Moment =>
  moment(objectRun.best_start_date || DEFAULT_START_DT, DATE_FORMAT)

export const runEndDate = (objectRun: LearningResourceRun): moment$Moment =>
  moment(objectRun.best_end_date || DEFAULT_END_DT, DATE_FORMAT)

export const compareRuns = (
  firstRun: LearningResourceRun,
  secondRun: LearningResourceRun
) => runStartDate(firstRun).diff(runStartDate(secondRun), "hours")

export const bestRun = (runs: Array<LearningResourceRun>) => {
  // Runs that are running right now
  const currentRuns = runs.filter(
    run => runStartDate(run).isSameOrBefore() && runEndDate(run).isAfter()
  )
  if (!emptyOrNil(currentRuns)) {
    return currentRuns[0]
  }

  // The next future run
  const futureRuns = runs
    .filter(run => runStartDate(run).isAfter())
    .sort(compareRuns)
  if (!emptyOrNil(futureRuns)) {
    return futureRuns[0]
  }

  // The most recent run that "ended"
  const mostRecentRuns = runs
    .filter(run => runStartDate(run).isSameOrBefore())
    .sort(compareRuns)
    .reverse()
  if (!emptyOrNil(mostRecentRuns)) {
    return mostRecentRuns[0]
  }
  return null
}

export const filterRunsByAvailability = (
  runs: ?Array<LearningResourceRun>,
  availabilities: ?Array<string>
) =>
  runs
    ? // $FlowFixMe
    runs.filter(run => inDateRanges(run, availabilities || []))
    : []

export const resourceLabel = (resource: string) => {
  switch (resource) {
  case LR_TYPE_USERLIST:
    return "User Lists"
  case LR_TYPE_LEARNINGPATH:
    return "Learning Paths"
  default:
    return concat(capitalize(resource), "s")
  }
}

export const maxPrice = (prices: Array<CoursePrice>) => {
  if (emptyOrNil(prices)) {
    return null
  }
  const price = Math.max(...prices.map(price => price.price))
  return price > 0 ? `${formatPrice(price)}` : "Free"
}

export const minPrice = (prices: Array<CoursePrice>) => {
  if (emptyOrNil(prices)) {
    return null
  }
  const price = Math.min(...prices.map(price => price.price))
  return price > 0 && price !== Infinity ? `${formatPrice(price)}` : "Free"
}

export const getStartDate = (
  object: Object,
  objectRun: LearningResourceRun
) => {
  if (object.platform === platforms.OCW) {
    return `${capitalize(objectRun.semester || "")} ${objectRun.year || ""}`
  } else if (objectRun.start_date) {
    return moment(objectRun.start_date).format("MMMM DD, YYYY")
  } else if (objectRun.best_start_date) {
    return moment(objectRun.best_start_date).format("MMMM DD, YYYY")
  }
  return "Ongoing"
}

export const getInstructorName = (instructor: CourseInstructor) => {
  if (instructor.full_name) {
    return instructor.full_name // Assume full name contains title if any
  } else if (instructor.first_name && instructor.last_name) {
    return `Prof. ${instructor.first_name} ${instructor.last_name}`
  } else if (instructor.last_name) {
    return `Prof. ${instructor.last_name}`
  }
  return ""
}

// prefer MicroMasters over MITx
const findMicroMasters = find(equals(offeredBys.micromasters))

export const getPreferredOfferedBy = (offeredBy: Array<string>): string =>
  findMicroMasters(offeredBy) || head(offeredBy)
