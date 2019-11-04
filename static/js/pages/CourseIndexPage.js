// @flow
import React from "react"
import { useRequest } from "redux-query-react"
import { useSelector } from "react-redux"
import { Link } from "react-router-dom"
import { createSelector } from "reselect"

import LearningResourceDrawer from "../components/LearningResourceDrawer"
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
import AddToListDialog from "../components/AddToListDialog"
import ResponsiveWrapper from "../components/ResponsiveWrapper"

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
import { PHONE, TABLET, DESKTOP } from "../lib/constants"

type Props = {|
  history: Object
|}

const favoritesListSelector = createSelector(
  favoritesSelector,
  ({ courses, bootcamps, programs, userLists, videos }) => [
    ...Object.values(courses),
    ...Object.values(bootcamps),
    ...Object.values(programs),
    ...Object.values(userLists),
    ...Object.values(videos)
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

  return (
    <BannerPageWrapper>
      <BannerPageHeader tall compactOnMobile>
        <BannerContainer tall compactOnMobile>
          <BannerImage src={COURSE_BANNER_URL} tall compactOnMobile />
        </BannerContainer>
        <CourseSearchbox
          onSubmit={e => {
            const { value } = e.target
            const newLocation = `${COURSE_SEARCH_URL}${toQueryString({
              q: value
            })}`
            history.push(newLocation)
          }}
        >
          <ResponsiveWrapper onlyOn={[TABLET, DESKTOP]}>
            <div className="link-wrapper">
              <Link className="link-button" to={COURSE_SEARCH_URL}>
                Explore
              </Link>
            </div>
          </ResponsiveWrapper>
        </CourseSearchbox>
      </BannerPageHeader>
      <ResponsiveWrapper onlyOn={[PHONE]}>
        <div className="wide-view-more">
          <Link className="link-button" to={COURSE_SEARCH_URL}>
            Explore
          </Link>
        </div>
      </ResponsiveWrapper>
      <Grid className="main-content one-column">
        {loaded ? (
          <Cell width={12}>
            {favorites.length !== 0 ? (
              <CourseCarousel title="Your Favorites" courses={favorites} />
            ) : null}
            {featuredCourses.length !== 0 ? (
              <CourseCarousel
                title="Featured Courses"
                courses={featuredCourses}
              />
            ) : null}
            <CourseCarousel
              title="Upcoming Courses"
              courses={upcomingCourses}
            />
            <CourseCarousel title="New Courses" courses={newCourses} />
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
      <AddToListDialog />
    </BannerPageWrapper>
  )
}
