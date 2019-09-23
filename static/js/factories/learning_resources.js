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
  LR_TYPE_USERLIST,
  DATE_FORMAT
} from "../lib/constants"

import type {
  Bootcamp,
  Course,
  CourseRun,
  Program,
  UserList
} from "../flow/discussionTypes"

const incrCourse = incrementer()
const courseId: any = incrementer()
const incrCourseRun = incrementer()

export const makeCourseRun = (): CourseRun => {
  return {
    // $FlowFixMe: Flow thinks incr.next().value may be undefined, but it won't ever be
    course_run_id:     `courserun_${incrCourseRun.next().value}`,
    id:                casual.integer,
    url:               casual.url,
    image_src:         "http://image.medium.url",
    short_description: casual.description,
    language:          casual.random_element(["en-US", "fr", null]),
    semester:          casual.random_element(["Fall", "Spring", null]),
    year:              casual.year,
    level:             casual.random_element(["Graduate", "Undergraduate", null]),
    start_date:        casual.date(DATE_FORMAT),
    end_date:          casual.date(DATE_FORMAT),
    best_start_date:   casual.date(DATE_FORMAT),
    best_end_date:     casual.date(DATE_FORMAT),
    enrollment_start:  casual.date(DATE_FORMAT),
    enrollment_end:    casual.date(DATE_FORMAT),
    availability:      casual.random_element([
      COURSE_ARCHIVED,
      COURSE_CURRENT,
      "Upcoming"
    ]),
    instructors: [
      {
        first_name: casual.name,
        last_name:  casual.name,
        full_name:  casual.name
      },
      {
        first_name: casual.name,
        last_name:  casual.name,
        full_name:  casual.name
      }
    ],
    prices: [{ mode: "audit", price: casual.number }]
  }
}

export const makeCourse = (): Course => ({
  // $FlowFixMe: Flow thinks incr.next().value may be undefined, but it won't ever be
  course_id:         `course_${incrCourse.next().value}`,
  id:                courseId.next().value,
  title:             casual.title,
  url:               casual.url,
  image_src:         "http://image.medium.url",
  short_description: casual.description,
  full_description:  casual.description,
  offered_by:        casual.random_element([platforms.edX, platforms.OCW, null]),
  platform:          casual.random_element([platforms.edX, platforms.OCW]),
  is_favorite:       casual.boolean,
  topics:            [{ name: casual.word }, { name: casual.word }],
  course_runs:       R.times(makeCourseRun, 3),
  object_type:       "course"
})

const incrBootcamp = incrementer()
const bootcampId: any = incrementer()

export const makeBootcamp = (): Bootcamp => ({
  // $FlowFixMe: Flow thinks incr.next().value may be undefined, but it won't ever be
  course_id:         `bootcamp_${incrBootcamp.next().value}`,
  id:                bootcampId.next().value,
  title:             casual.title,
  url:               casual.url,
  image_src:         "http://image.medium.url",
  short_description: casual.description,
  full_description:  casual.description,
  is_favorite:       casual.boolean,
  offered_by:        "bootcamps",
  topics:            [{ name: casual.word }, { name: casual.word }],
  course_runs:       R.times(makeCourseRun, 3),
  object_type:       "bootcamp"
})

const incrProgram = incrementer()

export const makeProgram = (): Program => ({
  // $FlowFixMe: Flow thinks incr.next().value may be undefined, but it won't ever be
  id:                incrProgram.next().value,
  short_description: casual.description,
  offered_by:        null,
  title:             casual.title,
  topics:            [{ name: casual.word }, { name: casual.word }],
  image_src:         "http://image.medium.url",
  image_description: casual.description,
  is_favorite:       casual.boolean,
  items:             [makeCourse(), makeCourse()],
  object_type:       "program"
})

const incrUserList = incrementer()

export const makeUserList = (): UserList => ({
  // $FlowFixMe: Flow thinks incr.next().value may be undefined, but it won't ever be
  id:                incrUserList.next().value,
  short_description: casual.description,
  offered_by:        null,
  title:             casual.title,
  topics:            [{ name: casual.word }, { name: casual.word }],
  is_favorite:       casual.boolean,
  image_src:         "http://image.medium.url",
  image_description: casual.description,
  items:             [makeCourse(), makeBootcamp(), makeProgram()],
  object_type:       "user_list"
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

const formatFavorite = contentType => resource => ({
  content_data: resource,
  content_type: contentType
})

const makeFavorite = obj => ({ ...obj, is_favorite: true })

export const makeFavoritesResponse = () => {
  const courses = R.times(makeCourse, 3).map(makeFavorite)
  const programs = R.times(makeProgram, 3).map(makeFavorite)
  const bootcamps = R.times(makeBootcamp, 3).map(makeFavorite)

  return [
    ...courses.map(formatFavorite(LR_TYPE_COURSE)),
    ...programs.map(formatFavorite(LR_TYPE_PROGRAM)),
    ...bootcamps.map(formatFavorite(LR_TYPE_BOOTCAMP))
  ]
}
