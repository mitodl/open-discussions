//@flow
import type { Course } from "../flow/discussionTypes"
import casual from "casual-browserify"
import { incrementer } from "../lib/util"
import { platforms } from "../lib/constants"

const incr = incrementer()

export const makeCourse = (): Course => {
  return {
    // $FlowFixMe: Flow thinks incr.next().value may be undefined, but it won't ever be
    course_id:         `course_${incr.next().value}`,
    title:             casual.title,
    image_src:         "http://image.medium.url",
    short_description: casual.description,
    full_description:  casual.description,
    platform:          casual.random_element([platforms.edX, platforms.OCW]),
    language:          casual.random_element(["en-US", "fr", null]),
    semester:          casual.random_element(["Fall", "Spring", null]),
    year:              casual.year,
    level:             casual.random_element(["Graduate", "Undergraduate", null]),
    start_date:        casual.date("YYYY-MM-DD[T]HH:mm:ss[Z]"),
    end_date:          casual.date("YYYY-MM-DD[T]HH:mm:ss[Z]"),
    enrollment_start:  casual.date("YYYY-MM-DD[T]HH:mm:ss[Z]"),
    enrollment_end:    casual.date("YYYY-MM-DD[T]HH:mm:ss[Z]"),
    instructors:       [
      { first_name: casual.name, last_name: casual.name },
      { first_name: casual.name, last_name: casual.name }
    ],
    topics: [{ name: casual.word }, { name: casual.word }],
    prices: [{ mode: "audit", price: casual.number }]
  }
}
