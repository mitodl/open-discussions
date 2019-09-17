// @flow
/* global SETTINGS: false */
import React from "react"
import Dotdotdot from "react-dotdotdot"
import { Link } from "react-router-dom"
import { querySelectors } from "redux-query"
import { connectRequest } from "redux-query-react"
import { connect } from "react-redux"
import { compose } from "redux"

import Card from "../components/Card"

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

import type { Course } from "../flow/discussionTypes"
import type { Dispatch } from "redux"

const THUMBNAIL_SIZE = 60

type StateProps = {|
  courses: Array<Course>,
  loaded: boolean
|}

type Props = {|
  ...StateProps,
  dispatch: Dispatch<*>
|}

export function NewCoursesWidget(props: Props) {
  const { loaded, courses } = props

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
                {availabilityLabel(course.course_runs[0].availability)} |{" "}
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

const mapStateToProps = (state: Object): StateProps => {
  const newCourses = newCoursesSelector(state)
  const upcomingCourses = upcomingCoursesSelector(state)

  const loaded =
    querySelectors.isFinished(state.queries, upcomingCoursesRequest()) &&
    querySelectors.isFinished(state.queries, newCoursesRequest())

  return {
    courses:
      loaded && newCourses && upcomingCourses
        ? flatZip(newCourses.slice(0, 5), upcomingCourses.slice(0, 5))
        : [],
    loaded
  }
}

const mapPropsToConfig = () => [upcomingCoursesRequest(), newCoursesRequest()]

export default compose(
  connect<Props, {||}, _, _, _, _>(mapStateToProps),
  connectRequest(mapPropsToConfig)
)(NewCoursesWidget)
