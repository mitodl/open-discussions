// @flow
import { assert } from "chai"
import _ from "lodash"

import { makeCourse } from "../factories/courses"
import {
  COURSE_AVAILABLE_NOW,
  COURSE_PRIOR,
  COURSE_UPCOMING
} from "./constants"
import { courseAvailability, minPrice, maxPrice } from "./courses"

describe("Course utils", () => {
  [
    ["2000-01-01", "2000-02-02", "mitx", _.capitalize(COURSE_PRIOR)],
    ["2000-01-01", "2500-02-02", "mitx", COURSE_AVAILABLE_NOW],
    ["2400-01-01", "2500-02-02", "mitx", _.capitalize(COURSE_UPCOMING)],
    ["2000-01-01", "2000-02-02", "ocw", COURSE_AVAILABLE_NOW]
  ].forEach(([startDate, endDate, platform, expected]) => {
    it(`courseAvailability should return ${expected} for ${platform} course running ${startDate} to ${endDate}`, () => {
      const course = makeCourse()
      course.start_date = startDate
      course.end_date = endDate
      course.platform = platform
      assert.equal(courseAvailability(course), expected)
    })
  })

  //
  ;[
    [[0.0, 50.0, 25.0], "$50", "Free"],
    [[null, null], "Free", "Free"],
    [[null, 0], "Free", "Free"],
    [[20, 100, 50], "$100", "$20"],
    [[null, 100, 75], "$100", "Free"]
  ].forEach(([prices, expectedMax, expectedMin]) => {
    it(`minPrice, maxPrice should return ${expectedMin}, ${expectedMax} for price range ${prices.toString()}`, () => {
      const course = makeCourse()
      course.prices = []
      prices.forEach(price => {
        if (!isNaN(price)) {
          // $FlowFixMe: course.prices is definitely not null here
          course.prices.push({
            mode:  "test",
            price: price
          })
        }
      })
      assert.equal(minPrice(course), expectedMin)
      assert.equal(maxPrice(course), expectedMax)
    })
  })
})
