//@flow
import casual from "casual-browserify"
import R from "ramda"

import { incrementer } from "../lib/util"
import {
  COURSE_ARCHIVED,
  COURSE_CURRENT,
  platforms,
  LR_TYPE_COURSE,
  LR_TYPE_BOOTCAMP,
  LR_TYPE_PROGRAM,
  LR_TYPE_USERLIST
} from "../lib/constants"

import type {
  Bootcamp,
  Course,
  Program,
  UserList
} from "../flow/discussionTypes"

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
  offered_by:        casual.random_element([platforms.edX, platforms.OCW, null]),
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
  offered_by:        "bootcamps",
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

export const makeProgram = (): Program => ({
  id:                casual.integer(1, 1000),
  short_description: casual.description,
  offered_by:        null,
  title:             casual.title,
  topics:            [{ name: casual.word }, { name: casual.word }],
  image_src:         "http://image.medium.url",
  image_description: casual.description,
  is_favorite:       casual.boolean,
  items:             [makeCourse(), makeCourse()]
})

export const makeUserList = (): UserList => ({
  id:                casual.integer(1, 1000),
  short_description: casual.description,
  offered_by:        null,
  title:             casual.title,
  topics:            [{ name: casual.word }, { name: casual.word }],
  is_favorite:       casual.boolean,
  image_src:         "http://image.medium.url",
  image_description: casual.description,
  items:             [makeCourse(), makeBootcamp(), makeProgram()]
})

export const makeLearningResource = (objectType: string) => {
  switch (objectType) {
  case LR_TYPE_COURSE:
    return R.merge({ object_type: LR_TYPE_COURSE }, makeCourse())
  case LR_TYPE_BOOTCAMP:
    return R.merge({ object_type: LR_TYPE_BOOTCAMP }, makeBootcamp())
  case LR_TYPE_PROGRAM:
    return R.merge({ object_type: LR_TYPE_PROGRAM }, makeProgram())
  case LR_TYPE_USERLIST:
    return R.merge({ object_type: LR_TYPE_USERLIST }, makeUserList())
  }
}
