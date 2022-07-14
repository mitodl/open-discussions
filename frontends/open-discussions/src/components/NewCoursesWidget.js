// @flow
/* global SETTINGS: false */
import React from "react"
import Dotdotdot from "react-dotdotdot"
import { Link } from "react-router-dom"
import { useSelector } from "react-redux"
import { useRequest } from "redux-query-react"

import { Card } from "ol-util" 

import {
  newCoursesRequest,
  newCoursesSelector,
  upcomingCoursesRequest,
  upcomingCoursesSelector
} from "../lib/queries/courses"
import { availabilityLabel } from "../lib/learning_resources"
import {
  embedlyThumbnail,
  COURSE_URL,
  defaultResourceImageURL
} from "../lib/url"
import { flatZip } from "../lib/util"

const THUMBNAIL_SIZE = 60

export default function NewCoursesWidget() {
  const [{ isFinished: isFinishedNew }] = useRequest(newCoursesRequest())
  const [{ isFinished: isFinishedUpcoming }] = useRequest(
    upcomingCoursesRequest()
  )

  const loaded = isFinishedNew && isFinishedUpcoming

  const newCourses = useSelector(newCoursesSelector)
  const upcomingCourses = useSelector(upcomingCoursesSelector)

  const courses =
    loaded && newCourses && upcomingCourses
      ? flatZip(newCourses.slice(0, 5), upcomingCourses.slice(0, 5))
      : []

  return loaded ? (
    <Card className="new-course-widget widget">
      <div className="title-row">
        <span className="title">Learn at MIT</span>
      </div>
      {courses.map((course, idx) => (
        <div className="course" key={idx}>
          <img
            src={embedlyThumbnail(
              SETTINGS.embedlyKey,
              course.image_src || defaultResourceImageURL(),
              THUMBNAIL_SIZE,
              THUMBNAIL_SIZE
            )}
            height={THUMBNAIL_SIZE}
          />
          <a target="_blank" rel="noopener noreferrer" href={course.url}>
            <div className="course-info-col">
              <div className="course-title">
                <Dotdotdot clamp={2}>{course.title}</Dotdotdot>
              </div>
              <div className="availability-and-platform">
                {availabilityLabel(course.runs[0].availability)} |{" "}
                {course.platform.toUpperCase()}
              </div>
            </div>
          </a>
        </div>
      ))}
      <div className="link-container">
        <Link className="more-link navy" to={COURSE_URL}>
          View More
        </Link>
      </div>
    </Card>
  ) : null
}
