//@flow
import casual from "casual-browserify"
import R from "ramda"

import { incrementer } from "../lib/util"
import {
  COURSE_ARCHIVED,
  COURSE_CURRENT,
  platforms,
  LR_TYPE_COURSE,
  LR_TYPE_BOOTCAMP
} from "../lib/constants"

import type { Bootcamp, Course } from "../flow/discussionTypes"

const incrCourse = incrementer()

const dateFormat = "YYYY-MM-DD[T]HH:mm:ss[Z]"

export const makeCourse = (): Course => ({
  // $FlowFixMe: Flow thinks incr.next().value may be undefined, but it won't ever be
  course_id:         `course_${incrCourse.next().value}`,
  id:                casual.integer(1, 1000),
  title:             casual.title,
  url:               casual.url,
  image_src:         "http://image.medium.url",
  short_description: casual.description,
  full_description:  casual.description,
  platform:          casual.random_element([platforms.edX, platforms.OCW]),
  language:          casual.random_element(["en-US", "fr", null]),
  semester:          casual.random_element(["Fall", "Spring", null]),
  year:              casual.year,
  level:             casual.random_element(["Graduate", "Undergraduate", null]),
  start_date:        casual.date(dateFormat),
  end_date:          casual.date(dateFormat),
  enrollment_start:  casual.date(dateFormat),
  enrollment_end:    casual.date(dateFormat),
  is_favorite:       casual.boolean,
  availability:      casual.random_element([
    COURSE_ARCHIVED,
    COURSE_CURRENT,
    "Upcoming"
  ]),
  instructors: [
    { first_name: casual.name, last_name: casual.name },
    { first_name: casual.name, last_name: casual.name }
  ],
  topics: [{ name: casual.word }, { name: casual.word }],
  prices: [{ mode: "audit", price: casual.number }]
})

const incrBootcamp = incrementer()

export const makeBootcamp = (): Bootcamp => ({
  // $FlowFixMe: Flow thinks incr.next().value may be undefined, but it won't ever be
  course_id:         `bootcamp_${incrBootcamp.next().value}`,
  id:                casual.integer(1, 1000),
  title:             casual.title,
  url:               casual.url,
  image_src:         "http://image.medium.url",
  short_description: casual.description,
  full_description:  casual.description,
  language:          casual.random_element(["en-US", "fr", null]),
  semester:          casual.random_element(["Fall", "Spring", null]),
  year:              casual.year,
  level:             casual.random_element(["Graduate", "Undergraduate", null]),
  start_date:        casual.date(dateFormat),
  end_date:          casual.date(dateFormat),
  enrollment_start:  casual.date(dateFormat),
  enrollment_end:    casual.date(dateFormat),
  is_favorite:       casual.boolean,
  availability:      casual.random_element([
    COURSE_ARCHIVED,
    COURSE_CURRENT,
    "Upcoming"
  ]),
  instructors: [
    { first_name: casual.name, last_name: casual.name },
    { first_name: casual.name, last_name: casual.name }
  ],
  topics: [{ name: casual.word }, { name: casual.word }],
  prices: [{ mode: "audit", price: casual.number }]
})

export const makeLearningResource = (objectType: string) => {
  switch (objectType) {
  case LR_TYPE_COURSE:
    return R.merge({ object_type: LR_TYPE_COURSE }, makeCourse())
  case LR_TYPE_BOOTCAMP:
    return R.merge({ object_type: LR_TYPE_BOOTCAMP }, makeBootcamp())
  }
}
