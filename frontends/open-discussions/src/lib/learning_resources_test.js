// @flow
import { assert } from "chai"
import moment from "moment"

import {
  COURSE_ARCHIVED,
  COURSE_AVAILABLE_NOW,
  COURSE_CURRENT,
  COURSE_PRIOR,
  LR_TYPE_COURSE,
  LR_TYPE_PROGRAM,
  LR_TYPE_USERLIST,
  DATE_FORMAT
} from "./constants"
import {
  availabilityLabel,
  minPrice,
  maxPrice,
  resourceLabel,
  bestRun
} from "./learning_resources"
import { makeCourse, makeRun } from "../factories/learning_resources"

describe("Course utils", () => {
  [
    [COURSE_ARCHIVED, COURSE_PRIOR],
    [COURSE_CURRENT, COURSE_AVAILABLE_NOW],
    ["Upcoming", "Upcoming"]
  ].forEach(([availability, expected]) => {
    it(`availabilityLabel should return ${expected} for course.availability of ${availability}`, () => {
      const course = makeCourse()
      course.runs[0].availability = availability
      assert.equal(availabilityLabel(course.runs[0].availability), expected)
    })
  })

  //
  ;[
    [[0.0, 50.0, 25.0], "$50", "Free"],
    [[null, null], "Free", "Free"],
    [[null, 0], "Free", "Free"],
    [[20.9, 100, 50], "$100", "20.90"],
    [[null, 100.23, 75], "$100.23", "Free"]
  ].forEach(([prices, expectedMax, expectedMin]) => {
    it(`minPrice, maxPrice should return ${expectedMin}, ${expectedMax} for price range ${prices.toString()}`, () => {
      const course = makeCourse()
      const courseRun = course.runs[0]
      courseRun.prices = []
      prices.forEach(price => {
        if (!isNaN(price)) {
          // $FlowFixMe: course.prices is definitely not null here
          courseRun.prices.push({
            mode:  "test",
            price: price
          })
        }
      })
      assert.equal(minPrice(courseRun.prices), expectedMin)
      assert.equal(maxPrice(courseRun.prices), expectedMax)
    })
  })

  it("minPrice should return a dollar sign if you pass the flag", () => {
    const courseRun = makeCourse().runs[0]
    courseRun.prices = [
      {
        mode:  "test",
        price: 100
      }
    ]
    assert.equal(minPrice(courseRun.prices, true), "$100")
  })

  //
  ;[
    [LR_TYPE_COURSE, "Courses"],
    [LR_TYPE_PROGRAM, "Programs"],
    [LR_TYPE_USERLIST, "Learning Lists"]
  ].forEach(([searchType, facetText]) => {
    it(`facet text should be ${facetText} for resource type ${searchType}`, () => {
      assert.equal(resourceLabel(searchType), facetText)
    })
  })

  //
  ;[
    [true, true, true, true],
    [false, true, true, true],
    [false, false, true, true],
    [false, false, false, true],
    [false, false, false, false]
  ].forEach(
    ([
      currentRunAvailable,
      futureRunAvailable,
      pastRunAvailable,
      runWithNullStartDatesAvailable
    ]) => {
      let message = ""
      if (currentRunAvailable) {
        message =
          "bestRun should return the current run when there is a current run"
      } else if (futureRunAvailable) {
        message =
          "bestRun should return the next future run when there is a future run and no current run"
      } else if (pastRunAvailable) {
        message =
          "bestRun should return the last past run when there is a past run and no future run or current run"
      } else if (runWithNullStartDatesAvailable) {
        message = "bestRun should not return a run with no start or end dates"
      } else {
        message = "bestRun should return null when there are no runs"
      }

      it(message, () => {
        const course = makeCourse()
        course.runs = []
        const currentDate = new Date()
        const currentRun = makeRun()
        const futureRun = makeRun()
        const pastRun = makeRun()
        const nullRun = makeRun()

        if (currentRunAvailable) {
          currentRun.start_date = moment(currentDate)
            .add(5, "days")
            .format(DATE_FORMAT)
          currentRun.end_date = moment(currentDate)
            .subtract(5, "days")
            .format(DATE_FORMAT)
          course.runs.push(currentRun)
        }

        if (futureRunAvailable) {
          futureRun.best_start_date = moment(currentDate)
            .add(5, "days")
            .format(DATE_FORMAT)
          futureRun.best_end_date = moment(currentDate)
            .add(6, "days")
            .format(DATE_FORMAT)
          course.runs.push(futureRun)

          const otherFutureRun = makeRun()
          otherFutureRun.best_start_date = moment(currentDate)
            .add(15, "days")
            .format(DATE_FORMAT)
          otherFutureRun.best_end_date = moment(currentDate)
            .add(16, "days")
            .format(DATE_FORMAT)
          course.runs.push(otherFutureRun)
        }

        if (pastRunAvailable) {
          pastRun.best_start_date = moment(currentDate)
            .subtract(5, "days")
            .format(DATE_FORMAT)
          pastRun.best_end_date = moment(currentDate)
            .subtract(4, "days")
            .format(DATE_FORMAT)
          course.runs.push(pastRun)

          const otherPastRun = makeRun()
          otherPastRun.best_start_date = moment(currentDate)
            .subtract(15, "days")
            .format(DATE_FORMAT)
          otherPastRun.best_end_date = moment(currentDate)
            .subtract(14, "days")
            .format(DATE_FORMAT)
          course.runs.push(otherPastRun)
        }

        if (runWithNullStartDatesAvailable) {
          nullRun.best_start_date = null
          nullRun.best_end_date = null
          course.runs.push(nullRun)
        }

        if (currentRunAvailable) {
          assert.equal(bestRun(course.runs), currentRun)
        } else if (futureRunAvailable) {
          assert.equal(bestRun(course.runs), futureRun)
        } else if (pastRunAvailable) {
          assert.equal(bestRun(course.runs), pastRun)
        } else {
          assert.equal(bestRun(course.runs), null)
        }
      })
    }
  )
})
