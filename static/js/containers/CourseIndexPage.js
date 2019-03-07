// @flow
import React from "react"
import { connectRequest, querySelectors } from "redux-query"
import { connect } from "react-redux"
import { compose } from "redux"

import CourseDrawer from "./CourseDrawer"

import CourseCarousel from "../components/CourseCarousel"

import { setShowCourseDrawer } from "../actions/ui"
import {
  featuredCoursesRequest,
  featuredCoursesSelector,
  upcomingCoursesRequest,
  upcomingCoursesSelector,
  newCoursesRequest,
  newCoursesSelector
} from "../lib/api/courses"

import type { Course } from "../flow/discussionTypes"

type OwnProps = {||}

type StateProps = {|
  featuredCourses: Array<Course>,
  upcomingCourses: Array<Course>,
  newCourses: Array<Course>,
  loaded: boolean
|}

type DispatchProps = {|
  setShowCourseDrawer: Function
|}

type Props = {|
  ...StateProps,
  ...OwnProps,
  ...DispatchProps
|}

export const CourseIndexPage = ({
  upcomingCourses,
  featuredCourses,
  newCourses,
  loaded,
  setShowCourseDrawer
}: Props) => (
  <React.Fragment>
    <div className="main-content one-column">
      {loaded ? (
        <React.Fragment>
          {featuredCourses.length !== 0 ? (
            <CourseCarousel
              title="Featured Courses"
              courses={featuredCourses}
              setShowCourseDrawer={setShowCourseDrawer}
            />
          ) : null}
          <CourseCarousel
            title="Upcoming Courses"
            courses={upcomingCourses}
            setShowCourseDrawer={setShowCourseDrawer}
          />
          <CourseCarousel
            title="New Courses"
            courses={newCourses}
            setShowCourseDrawer={setShowCourseDrawer}
          />
        </React.Fragment>
      ) : (
        "loading"
      )}
    </div>
    <CourseDrawer />
  </React.Fragment>
)

const mapStateToProps = (state: Object): StateProps => ({
  featuredCourses: featuredCoursesSelector(state),
  upcomingCourses: upcomingCoursesSelector(state),
  newCourses:      newCoursesSelector(state),
  loaded:
    querySelectors.isFinished(state.queries, featuredCoursesRequest()) &&
    querySelectors.isFinished(state.queries, upcomingCoursesRequest()) &&
    querySelectors.isFinished(state.queries, newCoursesRequest())
})

const mapDispatchToProps = {
  setShowCourseDrawer
}

const mapPropsToConfig = () => [
  featuredCoursesRequest(),
  upcomingCoursesRequest(),
  newCoursesRequest()
]

export default compose(
  connect<Props, OwnProps, _, DispatchProps, _, _>(
    mapStateToProps,
    mapDispatchToProps
  ),
  connectRequest(mapPropsToConfig)
)(CourseIndexPage)
