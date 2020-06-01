// @flow
import { assert } from "chai"

import {
  COURSE_ARCHIVED,
  COURSE_AVAILABLE_NOW,
  COURSE_CURRENT,
  COURSE_PRIOR,
  LR_TYPE_COURSE,
  LR_TYPE_PROGRAM,
  LR_TYPE_USERLIST
} from "./constants"
import {
  availabilityLabel,
  minPrice,
  maxPrice,
  resourceLabel
} from "./learning_resources"
import { makeCourse } from "../factories/learning_resources"

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
})
