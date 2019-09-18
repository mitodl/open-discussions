// @flow
import React, { useCallback } from "react"
import { useRequest } from "redux-query-react"
import { useSelector, useDispatch } from "react-redux"
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
import { CarouselLoading } from "../components/Loading"

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

type Props = {|
  history: Object
|}

const favoritesListSelector = createSelector(
  favoritesSelector,
  ({ courses, bootcamps, programs, userLists }) => [
    ...Object.values(courses),
    ...Object.values(bootcamps),
    ...Object.values(programs),
    ...Object.values(userLists)
  ]
)

export default function CourseIndexPage({ history }: Props) {
  const [{ isFinished: isFinishedFeatured }] = useRequest(
    featuredCoursesRequest()
  )
  const [{ isFinished: isFinishedUpcoming }] = useRequest(
    upcomingCoursesRequest()
  )
  const [{ isFinished: isFinishedNew }] = useRequest(newCoursesRequest())
  const [{ isFinished: isFinishedFavorites }] = useRequest(favoritesRequest())

  const featuredCourses = useSelector(featuredCoursesSelector)
  const upcomingCourses = useSelector(upcomingCoursesSelector)
  const newCourses = useSelector(newCoursesSelector)
  const favorites = useSelector(favoritesListSelector)

  const loaded =
    isFinishedFeatured &&
    isFinishedUpcoming &&
    isFinishedNew &&
    isFinishedFavorites

  const dispatch = useDispatch()
  const setShowResourceDrawerFunc = useCallback(
    args => dispatch(setShowResourceDrawer(args)),
    [dispatch]
  )

  return (
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
              View All
            </Link>
          </Cell>
        </Grid>
      </BannerPageHeader>
      <Grid className="main-content one-column">
        {loaded ? (
          <Cell width={12}>
            {favorites.length !== 0 ? (
              <CourseCarousel
                title="Your Favorites"
                courses={favorites}
                setShowResourceDrawer={setShowResourceDrawerFunc}
              />
            ) : null}
            {featuredCourses.length !== 0 ? (
              <CourseCarousel
                title="Featured Courses"
                courses={featuredCourses}
                setShowResourceDrawer={setShowResourceDrawerFunc}
              />
            ) : null}
            <CourseCarousel
              title="Upcoming Courses"
              courses={upcomingCourses}
              setShowResourceDrawer={setShowResourceDrawerFunc}
            />
            <CourseCarousel
              title="New Courses"
              courses={newCourses}
              setShowResourceDrawer={setShowResourceDrawerFunc}
            />
          </Cell>
        ) : (
          <Cell width={12}>
            <CarouselLoading />
            <CarouselLoading />
            <CarouselLoading />
          </Cell>
        )}
      </Grid>
      <LearningResourceDrawer />
    </BannerPageWrapper>
  )
}
