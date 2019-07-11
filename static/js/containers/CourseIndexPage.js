// @flow
import React from "react"
import { connectRequest, querySelectors } from "redux-query"
import { connect } from "react-redux"
import { compose } from "redux"

import CourseDrawer from "./LearningResourceDrawer"

import CourseCarousel from "../components/CourseCarousel"
import {
  BannerPageWrapper,
  BannerPageHeader,
  BannerContainer,
  BannerImage
} from "../components/PageBanner"
import { Cell, Grid } from "../components/Grid"
import SearchTextbox from "../components/SearchTextbox"

import { setShowLearningResourceDrawer } from "../actions/ui"
import {
  featuredCoursesRequest,
  featuredCoursesSelector,
  upcomingCoursesRequest,
  upcomingCoursesSelector,
  newCoursesRequest,
  newCoursesSelector
} from "../lib/api/courses"
import { toQueryString, COURSE_SEARCH_URL, COURSE_BANNER_URL } from "../lib/url"

import type { Course } from "../flow/discussionTypes"

type OwnProps = {|
  history: Object
|}

type StateProps = {|
  featuredCourses: Array<Course>,
  upcomingCourses: Array<Course>,
  newCourses: Array<Course>,
  loaded: boolean
|}

type DispatchProps = {|
  setShowLearningDrawer: Function
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
  setShowLearningDrawer,
  history
}: Props) => (
  <BannerPageWrapper>
    <BannerPageHeader tall>
      <BannerContainer tall>
        <BannerImage src={COURSE_BANNER_URL} tall />
      </BannerContainer>
      <Grid className="main-content two-column channel-header course-index-page">
        <Cell width={12} className="avatar-headline-row">
          <div className="course-search-greeting">
            <div className="headline">MIT Online Learning</div>
          </div>
          <SearchTextbox
            onSubmit={e => {
              const { value } = e.target
              const newLocation = `${COURSE_SEARCH_URL}${toQueryString({
                q:    value,
                type: "course"
              })}`
              history.push(newLocation)
            }}
            placeholder="Search Learning offerings"
            noFocusOnLoad
          />
        </Cell>
      </Grid>
    </BannerPageHeader>
    <Grid className="main-content one-column">
      {loaded ? (
        <Cell width={12}>
          {featuredCourses.length !== 0 ? (
            <CourseCarousel
              title="Featured Courses"
              courses={featuredCourses}
              setShowLearningDrawer={setShowLearningDrawer}
            />
          ) : null}
          <CourseCarousel
            title="Upcoming Courses"
            courses={upcomingCourses}
            setShowLearningDrawer={setShowLearningDrawer}
          />
          <CourseCarousel
            title="New Courses"
            courses={newCourses}
            setShowLearningDrawer={setShowLearningDrawer}
          />
        </Cell>
      ) : (
        "loading"
      )}
    </Grid>
    <CourseDrawer />
  </BannerPageWrapper>
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
  setShowLearningDrawer: setShowLearningResourceDrawer
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
