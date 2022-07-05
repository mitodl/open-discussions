// @flow
/* global SETTINGS: false */
import React, { useState } from "react"
import { useRequest } from "redux-query-react"
import { useSelector } from "react-redux"
import { createSelector } from "reselect"
import { memoize } from "lodash"

import { Cell, Grid } from "../components/Grid"
import {
  BannerPageWrapper,
  BannerPageHeader,
  BannerContainer,
  BannerImage
} from "ol-util"
import UserListFormDialog from "../components/UserListFormDialog"
import { UserListItemSortableCards } from "../components/UserListItems"

import { userListRequest, userListsSelector } from "../lib/queries/user_lists"
import { COURSE_SEARCH_BANNER_URL } from "../lib/url"
import {
  readableLearningResources,
  LR_TYPE_LEARNINGPATH
} from "../lib/constants"

const userListSelector = createSelector(userListsSelector, userLists =>
  memoize(userListID => (userLists ? userLists[userListID] : null))
)

type Props = {
  match: Object
}

const UL_PAGE_GRID_CLASSNAME = "main-content one-column narrow user-list-page"

export default function UserListDetailPage(props: Props) {
  const { match } = props
  const userListId = match.params.id

  const [{ isFinished }] = useRequest(userListRequest(userListId))
  const userList = useSelector(userListSelector)(userListId)

  const [sorting, setIsSorting] = useState(false)
  const [editing, setIsEditing] = useState(false)

  return (
    <BannerPageWrapper>
      <BannerPageHeader tall compactOnMobile>
        <BannerContainer tall compactOnMobile>
          <BannerImage src={COURSE_SEARCH_BANNER_URL} tall compactOnMobile />
        </BannerContainer>
      </BannerPageHeader>
      {isFinished ? (
        <React.Fragment>
          <Grid className={UL_PAGE_GRID_CLASSNAME}>
            <Cell width={12}>
              <h1 className="list-header">{userList.title}</h1>
              {userList.short_description ? (
                <p className="list-description">{userList.short_description}</p>
              ) : null}
            </Cell>
            {userList.author === SETTINGS.user_id ? (
              <Cell width={12} className="list-edit-controls">
                {userList.item_count > 1 &&
                userList.list_type === LR_TYPE_LEARNINGPATH ? (
                    <button
                      className="sort-list blue-btn"
                      onClick={() => setIsSorting(!sorting)}
                    >
                      {sorting
                        ? "Save"
                        : `Reorder ${
                          readableLearningResources[userList.object_type]
                        }`}
                    </button>
                  ) : null}
                <div className="count">
                  {userList.item_count}{" "}
                  {userList.item_count === 1 ? "item" : "items"}
                </div>
                <a
                  href="#"
                  className="edit-link"
                  onClick={() => setIsEditing(true)}
                >
                  <i className="material-icons edit">edit</i>
                  Edit
                </a>
              </Cell>
            ) : null}
          </Grid>
          <UserListItemSortableCards
            isSorting={sorting}
            className={UL_PAGE_GRID_CLASSNAME}
            userListId={userList.id}
            pageSize={50}
          />
        </React.Fragment>
      ) : null}
      {editing ? (
        <UserListFormDialog
          userList={userList}
          hide={() => setIsEditing(false)}
        />
      ) : null}
    </BannerPageWrapper>
  )
}
