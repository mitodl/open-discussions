// @flow
import React, { useEffect } from "react"
import { useRequest } from "redux-query-react"
import { useDispatch, useSelector } from "react-redux"
import { Link } from "react-router-dom"

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
import ResponsiveWrapper from "../components/ResponsiveWrapper"

import {
  featuredCoursesRequest,
  featuredCoursesSelector,
  upcomingCoursesRequest,
  upcomingCoursesSelector,
  newCoursesRequest,
  newCoursesSelector
} from "../lib/queries/courses"
import { newVideosRequest, newVideosSelector } from "../lib/queries/videos"
import {
  popularContentSelector,
  popularContentRequest
} from "../lib/queries/interactions"
import {
  favoritesRequest,
  favoritesListSelector
} from "../lib/queries/learning_resources"
import { toQueryString, COURSE_SEARCH_URL, COURSE_BANNER_URL } from "../lib/url"
import { PHONE, TABLET, DESKTOP } from "../lib/constants"
import { useLRDrawerParams } from "../hooks/learning_resources"
import { pushLRHistory } from "../actions/ui"

type Props = {|
  history: Object
|}

export default function CourseIndexPage({ history }: Props) {
  const [{ isFinished: isFinishedFeatured }] = useRequest(
    featuredCoursesRequest()
  )
  const [{ isFinished: isFinishedUpcoming }] = useRequest(
    upcomingCoursesRequest()
  )
  const [{ isFinished: isFinishedNew }] = useRequest(newCoursesRequest())
  const [{ isFinished: isFinishedFavorites }] = useRequest(favoritesRequest())
  const [{ isFinished: isFinishedVideos }] = useRequest(newVideosRequest())
  const [{ isFinished: isFinishedPopular }] = useRequest(
    popularContentRequest()
  )

  const featuredCourses = useSelector(featuredCoursesSelector)
  const upcomingCourses = useSelector(upcomingCoursesSelector)
  const newCourses = useSelector(newCoursesSelector)
  const newVideos = useSelector(newVideosSelector)
  const favorites = useSelector(favoritesListSelector)
  const popularResources = useSelector(popularContentSelector)

  const loaded =
    isFinishedFeatured &&
    isFinishedUpcoming &&
    isFinishedNew &&
    isFinishedFavorites &&
    isFinishedVideos &&
    isFinishedPopular

  const dispatch = useDispatch()
  const { objectId, objectType } = useLRDrawerParams()

  useEffect(() => {
    if (objectId && objectType) {
      dispatch(
        pushLRHistory({
          objectId,
          objectType
        })
      )
    }
  }, [])

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
            <CourseCarousel title="New Courses" courses={newCourses} />
            {popularResources.length !== 0 ? (
              <CourseCarousel
                title="Popular Learning Resources"
                courses={popularResources}
              />
            ) : null}
            <CourseCarousel
              title="Upcoming Courses"
              courses={upcomingCourses}
            />
            {newVideos.length !== 0 ? (
              <CourseCarousel title="New Videos" courses={newVideos} />
            ) : null}
          </Cell>
        ) : (
          <Cell width={12}>
            <CarouselLoading />
            <CarouselLoading />
            <CarouselLoading />
            <CarouselLoading />
          </Cell>
        )}
      </Grid>
    </BannerPageWrapper>
  )
}
