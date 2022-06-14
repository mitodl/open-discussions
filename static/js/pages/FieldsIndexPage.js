// @flow
import React from "react"
import { useRequest } from "redux-query-react"
import { useSelector } from "react-redux"
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
import { useLearningResourcePermalink } from "../hooks/learning_resources"

import type { LearningResourceSummary } from "../flow/discussionTypes"

type Props = {|
  history: Object
|}


export default function FieldsIndexPage({ history }: Props) {

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
        <Cell width={12}>
          <div>FIELDS INDEX PAGE - CONTENT PLACEHOLDER</div>
        </Cell>
      </Grid>
    </BannerPageWrapper>
  )
}
