// @flow
import { assert } from "chai"

import { makeCourse } from "../factories/learning_resources"
import {
  COURSE_ARCHIVED,
  COURSE_AVAILABLE_NOW,
  COURSE_CURRENT,
  COURSE_PRIOR
} from "./constants"
import { availabilityLabel, minPrice, maxPrice } from "./learning_resources"

describe("Course utils", () => {
  [
    [COURSE_ARCHIVED, COURSE_PRIOR],
    [COURSE_CURRENT, COURSE_AVAILABLE_NOW],
    ["Upcoming", "Upcoming"]
  ].forEach(([availability, expected]) => {
    it(`availabilityLabel should return ${expected} for course.availability of ${availability}`, () => {
      const course = makeCourse()
      course.availability = availability
      assert.equal(availabilityLabel(course.availability), expected)
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
