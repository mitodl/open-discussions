// @flow
import React from "react"
import { connectRequest, querySelectors } from "redux-query"
import { connect } from "react-redux"
import { compose } from "redux"
import { Link } from "react-router-dom"
import { createSelector } from "reselect"

import LearningResourceDrawer from "./LearningResourceDrawer"

import CourseCarousel from "../components/CourseCarousel"
import {
  BannerPageWrapper,
  BannerPageHeader,
  BannerContainer,
  BannerImage
} from "../components/PageBanner"
import { Cell, Grid } from "../components/Grid"
import CourseSearchbox from "../components/CourseSearchbox"

import { setShowResourceDrawer } from "../actions/ui"
import {
  featuredCoursesRequest,
  featuredCoursesSelector,
  upcomingCoursesRequest,
  upcomingCoursesSelector,
  newCoursesRequest,
  newCoursesSelector
} from "../lib/queries/courses"
import {
  favoritesRequest,
  favoritesSelector
} from "../lib/queries/learning_resources"
import { toQueryString, COURSE_SEARCH_URL, COURSE_BANNER_URL } from "../lib/url"

import type { LearningResourceSummary } from "../flow/discussionTypes"

type OwnProps = {|
  history: Object
|}

type StateProps = {|
  featuredCourses: Array<LearningResourceSummary>,
  upcomingCourses: Array<LearningResourceSummary>,
  newCourses: Array<LearningResourceSummary>,
  favorites: Array<Object>,
  loaded: boolean
|}

type DispatchProps = {|
  setShowResourceDrawer: Function
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
  setShowResourceDrawer,
  history,
  favorites
}: Props) => (
  <BannerPageWrapper>
    <BannerPageHeader tall>
      <BannerContainer tall>
        <BannerImage src={COURSE_BANNER_URL} tall />
      </BannerContainer>
      <Grid>
        <Cell width={4} />
        <Cell className="course-searchbox-container" width={4}>
          <CourseSearchbox
            onSubmit={e => {
              const { value } = e.target
              const newLocation = `${COURSE_SEARCH_URL}${toQueryString({
                q: value
              })}`
              history.push(newLocation)
            }}
          />
          <Link className="link-button" to={COURSE_SEARCH_URL}>
            See All Courses
          </Link>
        </Cell>
      </Grid>
    </BannerPageHeader>
    <Grid className="main-content one-column">
      {loaded ? (
        <Cell width={12}>
          <CourseCarousel
            title="Favorites"
            courses={favorites}
            setShowResourceDrawer={setShowResourceDrawer}
          />
          {featuredCourses.length !== 0 ? (
            <CourseCarousel
              title="Featured Courses"
              courses={featuredCourses}
              setShowResourceDrawer={setShowResourceDrawer}
            />
          ) : null}
          <CourseCarousel
            title="Upcoming Courses"
            courses={upcomingCourses}
            setShowResourceDrawer={setShowResourceDrawer}
          />
          <CourseCarousel
            title="New Courses"
            courses={newCourses}
            setShowResourceDrawer={setShowResourceDrawer}
          />
        </Cell>
      ) : (
        "loading"
      )}
    </Grid>
    <LearningResourceDrawer />
  </BannerPageWrapper>
)

const favoritesListSelector = createSelector(
  favoritesSelector,
  ({ courses, bootcamps, programs, userLists }) => [
    ...Object.values(courses),
    ...Object.values(bootcamps),
    ...Object.values(programs),
    ...Object.values(userLists)
  ]
)

const mapStateToProps = (state: Object): StateProps => ({
  featuredCourses: featuredCoursesSelector(state),
  upcomingCourses: upcomingCoursesSelector(state),
  newCourses:      newCoursesSelector(state),
  favorites:       favoritesListSelector(state),
  loaded:
    querySelectors.isFinished(state.queries, featuredCoursesRequest()) &&
    querySelectors.isFinished(state.queries, upcomingCoursesRequest()) &&
    querySelectors.isFinished(state.queries, newCoursesRequest()) &&
    querySelectors.isFinished(state.queries, favoritesRequest())
})

const mapDispatchToProps = {
  setShowResourceDrawer
}

const mapPropsToConfig = () => [
  featuredCoursesRequest(),
  upcomingCoursesRequest(),
  newCoursesRequest(),
  favoritesRequest()
]

export default compose(
  connect<Props, OwnProps, _, DispatchProps, _, _>(
    mapStateToProps,
    mapDispatchToProps
  ),
  connectRequest(mapPropsToConfig)
)(CourseIndexPage)
