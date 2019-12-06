// @flow
import React from "react"
import { useRequest } from "redux-query-react"
import { useSelector } from "react-redux"

import { Cell, Grid } from "../components/Grid"
import {
  BannerPageWrapper,
  BannerPageHeader,
  BannerContainer,
  BannerImage
} from "../components/PageBanner"
import { LearningResourceCard } from "../components/LearningResourceCard"

import { SEARCH_LIST_UI } from "../lib/search"
import { COURSE_SEARCH_BANNER_URL } from "../lib/url"
import {
  favoritesRequest,
  favoritesListSelector
} from "../lib/queries/learning_resources"

export default function FavoritesDetailPage() {
  const [{ isFinished }] = useRequest(favoritesRequest())
  const favorites = useSelector(favoritesListSelector)

  return (
    <BannerPageWrapper>
      <BannerPageHeader tall compactOnMobile>
        <BannerContainer tall compactOnMobile>
          <BannerImage src={COURSE_SEARCH_BANNER_URL} tall compactOnMobile />
        </BannerContainer>
      </BannerPageHeader>
      {isFinished ? (
        <Grid className="main-content one-column narrow user-list-page">
          <Cell width={12}>
            <h1 className="list-header">My Favorites</h1>
          </Cell>
          {favorites.length !== 0 ? (
            favorites.map((item, i) => (
              <Cell width={12} key={i}>
                <LearningResourceCard
                  object={item}
                  searchResultLayout={SEARCH_LIST_UI}
                />
              </Cell>
            ))
          ) : (
            <Cell width={12} className="empty-message">
              You don't have any favorites.
            </Cell>
          )}
        </Grid>
      ) : null}
    </BannerPageWrapper>
  )
}
