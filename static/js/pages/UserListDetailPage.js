// @flow
/* global SETTINGS: false */
import React, { useState } from "react"
import { useRequest, useMutation } from "redux-query-react"
import { useSelector } from "react-redux"
import { createSelector } from "reselect"
import { memoize } from "lodash"
import arrayMove from "array-move"

import LearningResourceDrawer from "../components/LearningResourceDrawer"
import { Cell, Grid } from "../components/Grid"
import {
  BannerPageWrapper,
  BannerPageHeader,
  BannerContainer,
  BannerImage
} from "../components/PageBanner"
import { LearningResourceCard } from "../components/LearningResourceCard"
import AddToListDialog from "../components/AddToListDialog"
import UserListFormDialog from "../components/UserListFormDialog"
import { SortableItem, SortableContainer } from "../components/SortableList"

import { SEARCH_LIST_UI } from "../lib/search"
import {
  userListRequest,
  userListsSelector,
  userListMutation
} from "../lib/queries/user_lists"
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

  const [{ isPending: listIsSaving }, updateUserList] = useMutation(
    userListMutation
  )

  const [sorting, setIsSorting] = useState(false)
  const [editing, setIsEditing] = useState(false)
  const [temporaryList, setTemporaryList] = useState([])

  const listItems = isFinished ? userList.items : []

  const sortingItems = listIsSaving ? temporaryList : listItems

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
                {userList.items.length > 1 &&
                userList.list_type === LR_TYPE_LEARNINGPATH ? (
                    <button
                      className="sort-list blue-btn"
                      onClick={() => setIsSorting(!sorting)}
                    >
                      {sorting
                        ? `Stop sorting ${
                          readableLearningResources[userList.object_type]
                        }`
                        : `Reorder ${
                          readableLearningResources[userList.object_type]
                        }`}
                    </button>
                  ) : null}
                <div className="count">
                  {userList.items.length}{" "}
                  {userList.items.length === 1 ? "item" : "items"}
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
          {sorting ? (
            <SortableContainer
              shouldCancelStart={() => listIsSaving}
              onSortEnd={async ({ oldIndex, newIndex }) => {
                const newList = arrayMove(userList.items, oldIndex, newIndex)
                setTemporaryList(newList)
                await updateUserList({
                  id:    userList.id,
                  items: newList.map((item, idx) => ({
                    id:       item.id,
                    position: idx
                  }))
                })
                setTemporaryList([])
              }}
            >
              <Grid
                className={
                  listIsSaving
                    ? `${UL_PAGE_GRID_CLASSNAME} saving`
                    : UL_PAGE_GRID_CLASSNAME
                }
              >
                {sortingItems.map((item, i) => (
                  <SortableItem key={`item-${item.id}`} index={i}>
                    <Cell width={12}>
                      <LearningResourceCard
                        object={item.content_data}
                        searchResultLayout={SEARCH_LIST_UI}
                        reordering
                      />
                    </Cell>
                  </SortableItem>
                ))}
              </Grid>
            </SortableContainer>
          ) : (
            <Grid className={UL_PAGE_GRID_CLASSNAME}>
              {userList.items.map((item, i) => (
                <Cell width={12} key={i}>
                  <LearningResourceCard
                    object={item.content_data}
                    searchResultLayout={SEARCH_LIST_UI}
                  />
                </Cell>
              ))}
            </Grid>
          )}
        </React.Fragment>
      ) : null}
      {editing ? (
        <UserListFormDialog
          userList={userList}
          hide={() => setIsEditing(false)}
        />
      ) : null}
      <LearningResourceDrawer />
      <AddToListDialog />
    </BannerPageWrapper>
  )
}
