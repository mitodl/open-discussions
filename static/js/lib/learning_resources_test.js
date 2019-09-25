// @flow
import { assert } from "chai"
import sinon from "sinon"
import { times } from "ramda"

import {
  COURSE_ARCHIVED,
  COURSE_AVAILABLE_NOW,
  COURSE_CURRENT,
  COURSE_PRIOR,
  DATE_FORMAT,
  DEFAULT_END_DT,
  DEFAULT_START_DT,
  LR_TYPE_BOOTCAMP,
  LR_TYPE_COURSE,
  LR_TYPE_PROGRAM,
  LR_TYPE_USERLIST
} from "./constants"
import { AVAILABILITY_MAPPING } from "./search"
import {
  availabilityLabel,
  minPrice,
  maxPrice,
  resourceLabel,
  availabilityFacetLabel,
  availabilityFilterToMoment,
  inDateRanges,
  bestRunLabel,
  bestRun,
  runStartDate,
  runEndDate,
  getStartDate,
  getInstructorName
} from "./learning_resources"
import { makeCourse, makeCourseRun } from "../factories/learning_resources"
import moment from "moment"

describe("Course utils", () => {
  [
    [COURSE_ARCHIVED, COURSE_PRIOR],
    [COURSE_CURRENT, COURSE_AVAILABLE_NOW],
    ["Upcoming", "Upcoming"]
  ].forEach(([availability, expected]) => {
    it(`availabilityLabel should return ${expected} for course.availability of ${availability}`, () => {
      const course = makeCourse()
      course.course_runs[0].availability = availability
      assert.equal(
        availabilityLabel(course.course_runs[0].availability),
        expected
      )
    })
  })

  //
  ;[
    [[0.0, 50.0, 25.0], "$50.00", "Free"],
    [[null, null], "Free", "Free"],
    [[null, 0], "Free", "Free"],
    [[20, 100, 50], "$100.00", "$20.00"],
    [[null, 100, 75], "$100.00", "Free"]
  ].forEach(([prices, expectedMax, expectedMin]) => {
    it(`minPrice, maxPrice should return ${expectedMin}, ${expectedMax} for price range ${prices.toString()}`, () => {
      const course = makeCourse()
      const courseRun = course.course_runs[0]
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
      assert.equal(minPrice(courseRun), expectedMin)
      assert.equal(maxPrice(courseRun), expectedMax)
    })
  })

  //
  ;[
    [LR_TYPE_COURSE, "Courses"],
    [LR_TYPE_BOOTCAMP, "Bootcamps"],
    [LR_TYPE_PROGRAM, "Programs"],
    [LR_TYPE_USERLIST, "Learning Paths"]
  ].forEach(([searchType, facetText]) => {
    it(`facet text should be ${facetText} for resource type ${searchType}`, () => {
      assert.equal(resourceLabel(searchType), facetText)
    })
  })

  //
  ;[
    ["availableNow", AVAILABILITY_MAPPING["availableNow"].label],
    ["nextWeek", AVAILABILITY_MAPPING["nextWeek"].label],
    ["nextMonth", AVAILABILITY_MAPPING["nextMonth"].label],
    ["next3Months", AVAILABILITY_MAPPING["next3Months"].label],
    ["next6Months", AVAILABILITY_MAPPING["next6Months"].label],
    ["nextYear", AVAILABILITY_MAPPING["nextYear"].label],
    ["something", "something"],
    [null, null]
  ].forEach(([searchType, label]) => {
    it(`facet label should be ${String(label)} for search type ${String(
      searchType
    )}`, () => {
      assert.equal(availabilityFacetLabel(searchType), label)
    })
  })
})

describe("Course run availability utils", () => {
  let clock

  beforeEach(() => {
    clock = sinon.useFakeTimers(new Date("2019-09-01T00:00:00Z"))
  })

  afterEach(() => {
    clock.restore()
  })

  //
  ;[
    ["now", "2019-09-01T"],
    ["now+7d", "2019-09-08T"],
    ["now+6M", "2020-03-01T"],
    ["foo", null]
  ].forEach(([filter, expected]) => {
    it(`parseDateFilter should return ${String(
      expected
    )} for filter ${filter} and ending=false`, () => {
      const parsedStartDate = availabilityFilterToMoment(filter, false)
      assert.equal(
        parsedStartDate ? parsedStartDate.format(DATE_FORMAT) : parsedStartDate,
        expected ? `${expected}00:00:00Z` : null
      )
      const parsedEndDate = availabilityFilterToMoment(filter, true)
      assert.equal(
        parsedEndDate ? parsedEndDate.format(DATE_FORMAT) : parsedEndDate,
        expected ? `${expected}23:59:59Z` : null
      )
    })
  })

  //
  ;[
    [
      "2019-08-01T00:00:00Z",
      "2019-08-31T00:00:00Z",
      ["availableNow"],
      true,
      AVAILABILITY_MAPPING.availableNow.label
    ],
    [
      "2019-08-02T00:00:00Z",
      "2019-08-31T00:00:00Z",
      ["nextWeek"],
      false,
      AVAILABILITY_MAPPING.availableNow.label
    ],
    [
      "2019-08-02T00:00:00Z",
      "2019-08-31T00:00:00Z",
      ["availableNow", "nextWeek"],
      true,
      AVAILABILITY_MAPPING.availableNow.label
    ],
    [
      "2019-09-02T00:00:00Z",
      "2019-10-31T00:00:00Z",
      ["nextWeek"],
      true,
      AVAILABILITY_MAPPING.nextWeek.label
    ],
    [
      "2019-08-01T00:00:00Z",
      null,
      ["availableNow"],
      true,
      AVAILABILITY_MAPPING.availableNow.label
    ],
    [
      null,
      "2019-08-31T00:00:00Z",
      ["availableNow"],
      true,
      AVAILABILITY_MAPPING.availableNow.label
    ],
    [
      null,
      "2019-08-31T00:00:00Z",
      ["nextWeek"],
      false,
      AVAILABILITY_MAPPING.availableNow.label
    ],
    [
      null,
      null,
      ["availableNow"],
      true,
      AVAILABILITY_MAPPING.availableNow.label
    ],
    [null, null, ["nextWeek"], false, AVAILABILITY_MAPPING.availableNow.label],
    [
      "2019-09-02T00:00:00Z",
      "2019-09-30T00:00:00Z",
      ["availableNow"],
      false,
      AVAILABILITY_MAPPING.nextWeek.label
    ],
    [
      "2019-09-02T00:00:00Z",
      null,
      ["availableNow"],
      false,
      AVAILABILITY_MAPPING.nextWeek.label
    ],
    [
      null,
      "2019-09-31T00:00:00Z",
      ["availableNow"],
      true,
      AVAILABILITY_MAPPING.availableNow.label
    ],
    [
      "2019-09-02T00:00:00Z",
      "2019-09-30T00:00:00Z",
      ["availableNow", "nextWeek"],
      true,
      AVAILABILITY_MAPPING.nextWeek.label
    ],
    [
      "2019-09-02T00:00:00Z",
      null,
      ["availableNow", "nextWeek"],
      true,
      AVAILABILITY_MAPPING.nextWeek.label
    ],
    [
      null,
      "2019-09-30T00:00:00Z",
      ["availableNow", "nextWeek"],
      true,
      AVAILABILITY_MAPPING.availableNow.label
    ],
    [
      "2020-08-02T00:00:00Z",
      null,
      ["nextYear"],
      true,
      AVAILABILITY_MAPPING.nextYear.label
    ],
    ["2030-08-02T00:00:00Z", null, ["nextYear"], false, null]
  ].forEach(([startDate, endDate, availabilities, expected, label]) => {
    const courseRun = makeCourseRun()
    courseRun.best_start_date = startDate
    courseRun.best_end_date = endDate

    it(`inDateRanges should return ${String(expected)} for start_date ${String(
      startDate
    )}, end_date ${String(endDate)}, availabilities ${String(
      availabilities
    )}`, () => {
      assert.equal(inDateRanges(courseRun, availabilities), expected)
    })

    it(`bestRunLabel should return ${String(label)} for dates ${String(
      startDate
    )}-${String(endDate)}`, () => {
      assert.equal(bestRunLabel(courseRun), label)
    })
  })

  //
  ;[
    [
      ["2019-09-02", "2019-08-31", "2019-10-22"],
      ["2019-10-02", "2019-09-30", "2019-11-22"],
      "2019-08-31"
    ],
    [
      ["2019-06-22", "2019-08-01", "2019-07-02"],
      ["2019-08-02", "2019-08-31", "2019-08-22"],
      "2019-08-01"
    ],
    [
      ["2019-11-02", "2019-10-01", "2019-12-22"],
      ["2019-12-02", "2019-11-30", "2019-12-23"],
      "2019-10-01"
    ],
    [
      ["2019-11-02", "2019-10-01", "2019-10-22"],
      ["2019-12-02", null, "2019-11-22"],
      "2019-10-01"
    ],
    [
      ["2019-11-02", null, "2019-10-22"],
      ["2019-12-02", "2019-11-31", "2019-11-22"],
      "2019-10-22"
    ]
  ].forEach(([startDates, endDates, expected]) => {
    it(`best run of 3 should have start_date ${expected}`, () => {
      const runs = times(makeCourseRun, 3)
      const setDates = iter => {
        runs[iter].best_start_date = startDates[iter]
          ? `${startDates[iter]}T00:00:00Z`
          : null
        runs[iter].best_end_date = endDates[iter]
          ? `${endDates[iter]}T00:00:00Z`
          : null
      }
      times(setDates, 3)
      // $FlowFixMe: best_start_date won't be null for these tests
      assert.equal(bestRun(runs).best_start_date, `${expected}T00:00:00Z`)
    })
  })

  //
  ;[
    ["2019-09-01T00:00:00Z", "2019-09-01T00:00:00Z"],
    [null, DEFAULT_START_DT]
  ].forEach(([startDate, expectedDate]) => {
    it(`runStartDate() should return  ${expectedDate} for run with best_start_date ${String(
      startDate
    )}`, () => {
      const run = makeCourseRun()
      run.best_start_date = startDate
      assert.equal(
        runStartDate(run).format(DATE_FORMAT),
        moment(expectedDate, DATE_FORMAT).format(DATE_FORMAT)
      )
    })
  })

  //
  ;[
    ["2019-09-01T00:00:00Z", "2019-09-01T00:00:00Z"],
    [null, DEFAULT_END_DT]
  ].forEach(([endDate, expectedDate]) => {
    it(`runEndDate() should return  ${expectedDate} for run with best_end_date ${String(
      endDate
    )}`, () => {
      const run = makeCourseRun()
      run.best_end_date = endDate
      assert.equal(
        runEndDate(run).format(DATE_FORMAT),
        moment(expectedDate, DATE_FORMAT).format(DATE_FORMAT)
      )
    })
  })

  //
  ;[
    ["ocw", "2019-09-01", "2019-08-01", "Fall 2019"],
    ["mitx", "2019-09-01", "2019-08-01", "september 01, 2019"],
    ["mitx", null, "2019-08-01", "august 01, 2019"],
    ["mitx", null, null, "Ongoing"]
  ].forEach(([platform, startDt, bestDt, expected]) => {
    it(`getStartDate should return ${expected} for ${platform} run with start_dt ${String(
      startDt
    )}, best_dt ${String(bestDt)}`, () => {
      const course = makeCourse()
      course.platform = platform
      const courseRun = makeCourseRun()
      courseRun.start_date = startDt
      courseRun.best_start_date = bestDt
      courseRun.semester = "Fall"
      courseRun.year = "2019"
      assert.equal(getStartDate(course, courseRun), expected)
    })
  })

  //
  ;[
    [{ first_name: "", last_name: "", full_name: "" }, ""],
    [{ first_name: "Joe", last_name: "", full_name: "" }, ""],
    [{ first_name: "", last_name: "Smith", full_name: "" }, "Prof. Smith"],
    [
      { first_name: "Joe", last_name: "Smith", full_name: "" },
      "Prof. Joe Smith"
    ],
    [
      { first_name: "Joe", last_name: "", full_name: "Joe Smith" },
      "Prof. Joe Smith"
    ]
  ].forEach(([input, expected]) => {
    it(`getInstructorName should return ${expected} when given ${input.toString()}`, () => {
      assert.equal(getInstructorName(input), expected)
    })
  })
})
