//@flow
import casual from "casual-browserify"
import moment from "moment"
import R from "ramda"

import { incrementer } from "../lib/util"
import {
  COURSE_ARCHIVED,
  COURSE_CURRENT,
  platforms,
  offeredBys,
  LR_TYPE_COURSE,
  LR_TYPE_BOOTCAMP,
  LR_TYPE_PROGRAM,
  LR_TYPE_USERLIST,
  LR_TYPE_LEARNINGPATH,
  LR_TYPE_VIDEO,
  OBJECT_TYPE_MAPPING,
  DATE_FORMAT
} from "../lib/constants"

import type {
  Bootcamp,
  Course,
  CourseTopic,
  LearningResourceRun,
  Program,
  UserList,
  ListItem,
  Video
} from "../flow/discussionTypes"

const incrCourse = incrementer()
const courseId: any = incrementer()
const incrRun: any = incrementer()
const topicId: any = incrementer()

const OFFERORS = R.values(offeredBys)

export const makeTopic = (): CourseTopic => ({
  // $FlowFixMe: Flow thinks incr.next().value may be undefined, but it won't ever be
  id:   topicId.next().value,
  name: casual.title
})

export const makeRun = (): LearningResourceRun => {
  return {
    run_id:            `courserun_${incrRun.next().value}`,
    id:                incrRun.next().value,
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
    prices: [{ mode: "audit", price: casual.integer(1, 1000) }]
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
  offered_by:        [casual.random_element(OFFERORS)],
  platform:          casual.random_element(R.values(platforms)),
  is_favorite:       casual.boolean,
  topics:            R.times(makeTopic, 2),
  runs:              R.times(makeRun, 3),
  object_type:       "course",
  lists:             []
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
  offered_by:        [offeredBys.bootcamps],
  topics:            R.times(makeTopic, 2),
  runs:              R.times(makeRun, 3),
  object_type:       "bootcamp",
  lists:             []
})

const incrUserListItem = incrementer()

export const makeUserListItem = (objectType: string) => {
  const content = makeLearningResource(objectType)
  return {
    // $FlowFixMe: Flow thinks incr.next().value may be undefined, but it won't ever be
    id:           incrUserListItem.next().value,
    is_favorite:  casual.boolean,
    object_id:    content.id,
    position:     casual.integer(1, 1000),
    program:      casual.integer(1, 1000),
    content_type: OBJECT_TYPE_MAPPING[objectType],
    content_data: content
  }
}

const incrProgram = incrementer()

export const makeProgram = (): Program => ({
  // $FlowFixMe: Flow thinks incr.next().value may be undefined, but it won't ever be
  id:                incrProgram.next().value,
  short_description: casual.description,
  offered_by:        [casual.random_element(OFFERORS)],
  title:             casual.title,
  url:               casual.url,
  topics:            R.times(makeTopic, 2),
  image_src:         "http://image.medium.url",
  image_description: casual.description,
  is_favorite:       casual.boolean,
  items:             [
    // $FlowFixMe: flow seems confused here
    makeUserListItem(LR_TYPE_COURSE),
    makeUserListItem(LR_TYPE_COURSE)
  ],
  object_type: "program",
  runs:        [makeRun()],
  lists:       []
})

const incrUserList = incrementer()

export const makeUserList = (): UserList => ({
  // $FlowFixMe: Flow thinks incr.next().value may be undefined, but it won't ever be
  id:                incrUserList.next().value,
  short_description: casual.description,
  offered_by:        [],
  title:             casual.title,
  topics:            R.times(makeTopic, 2),
  is_favorite:       casual.boolean,
  image_src:         "http://image.medium.url",
  image_description: casual.description,
  item_count:        3,
  object_type:       "userlist",
  list_type:         "userlist",
  profile_img:       casual.url,
  profile_name:      casual.name,
  privacy_level:     casual.random_element(["public", "private"]),
  author:            casual.integer(1, 1000),
  lists:             [],
  author_name:       casual.name
})

export const makeUserListItems = (count: number = 3): Array<ListItem> =>
  R.times(
    () =>
      makeUserListItem(
        casual.random_element([
          LR_TYPE_VIDEO,
          LR_TYPE_COURSE,
          LR_TYPE_PROGRAM,
          LR_TYPE_BOOTCAMP,
          LR_TYPE_USERLIST
        ])
      ),
    count
  )
const incrVideo = incrementer()
export const makeVideo = (): Video => ({
  // $FlowFixMe: Flow thinks incr.next().value may be undefined, but it won't ever be
  id:                incrVideo.next().value,
  video_id:          `video_${String(casual.random)}`,
  title:             casual.title,
  url:               casual.url,
  is_favorite:       casual.boolean,
  last_updated:      casual.date(DATE_FORMAT),
  image_src:         "http://image.medium.url",
  short_description: casual.description,
  duration:          moment.duration(casual.integer(30, 60 * 90) * 1000).toISOString(),
  topics:            R.times(makeTopic, 2),
  object_type:       LR_TYPE_VIDEO,
  offered_by:        [casual.random_element([offeredBys.mitx, offeredBys.ocw])],
  runs:              [],
  lists:             []
})

export const makeLearningResource = (objectType: string): Object => {
  switch (objectType) {
  case LR_TYPE_COURSE:
    return R.merge({ object_type: LR_TYPE_COURSE }, makeCourse())
  case LR_TYPE_BOOTCAMP:
    return R.merge({ object_type: LR_TYPE_BOOTCAMP }, makeBootcamp())
  case LR_TYPE_PROGRAM:
    return R.merge({ object_type: LR_TYPE_PROGRAM }, makeProgram())
  case LR_TYPE_USERLIST:
    return R.merge(
      { object_type: LR_TYPE_USERLIST, list_type: LR_TYPE_USERLIST },
      makeUserList()
    )
  case LR_TYPE_LEARNINGPATH:
    return R.merge(
      { object_type: LR_TYPE_LEARNINGPATH, list_type: LR_TYPE_LEARNINGPATH },
      makeUserList()
    )
  case LR_TYPE_VIDEO:
    return R.merge({ object_type: LR_TYPE_VIDEO }, makeVideo())
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
