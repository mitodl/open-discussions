// @flow
import React from "react"
import { useRequest } from "redux-query-react"
import { useSelector } from "react-redux"
import { createSelector } from "reselect"

import { Cell, Grid } from "../components/Grid"
import {
  BannerPageWrapper,
  BannerPageHeader,
  BannerContainer,
  BannerImage
} from "../components/PageBanner"
import UserListCard from "../components/UserListCard"

import { userListsRequest, userListsSelector } from "../lib/queries/user_lists"
import { COURSE_SEARCH_BANNER_URL } from "../lib/url"

const userListsPageSelector = createSelector(
  userListsSelector,
  userLists =>
    userLists ? Object.keys(userLists).map(key => userLists[key]) : null
)

export default function UserListPage() {
  const [{ isFinished }] = useRequest(userListsRequest())

  const userLists = useSelector(userListsPageSelector)

  return (
    <BannerPageWrapper>
      <BannerPageHeader tall compactOnMobile>
        <BannerContainer tall compactOnMobile>
          <BannerImage src={COURSE_SEARCH_BANNER_URL} tall compactOnMobile />
        </BannerContainer>
      </BannerPageHeader>
      <Grid className="main-content one-column narrow user-list-page">
        <Cell width={12}>
          <h1 className="my-lists">My Lists</h1>
        </Cell>
        {isFinished
          ? userLists.map((list, i) => (
            <Cell width={12} key={i}>
              <UserListCard userList={list} />
            </Cell>
          ))
          : null}
      </Grid>
    </BannerPageWrapper>
  )
}
