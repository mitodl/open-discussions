// @flow
import React from "react"
import { useRequest } from "redux-query-react"
import { useSelector } from "react-redux"
import { createSelector } from "reselect"
import { memoize } from "lodash"

import LearningResourceDrawer from "../components/LearningResourceDrawer"
import { Cell, Grid } from "../components/Grid"
import {
  BannerPageWrapper,
  BannerPageHeader,
  BannerContainer,
  BannerImage
} from "../components/PageBanner"
import LearningResourceCard from "../components/LearningResourceCard"
import AddToListDialog from "../components/AddToListDialog"

import { SEARCH_LIST_UI } from "../lib/search"
import { userListRequest, userListsSelector } from "../lib/queries/user_lists"
import { COURSE_SEARCH_BANNER_URL } from "../lib/url"

const userListSelector = createSelector(userListsSelector, userLists =>
  memoize(userListID => (userLists ? userLists[userListID] : null))
)

type Props = {
  match: Object
}

export default function UserListDetailPage(props: Props) {
  const { match } = props
  const userListId = match.params.id

  const [{ isFinished }] = useRequest(userListRequest(userListId))
  const userList = useSelector(userListSelector)(userListId)

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
            <h1 className="list-header">{userList.title}</h1>
          </Cell>
          {userList.items.map((item, i) => (
            <Cell width={12} key={i}>
              <LearningResourceCard
                object={item.content_data}
                searchResultLayout={SEARCH_LIST_UI}
              />
            </Cell>
          ))}
        </Grid>
      ) : null}
      <LearningResourceDrawer />
      <AddToListDialog />
    </BannerPageWrapper>
  )
}
