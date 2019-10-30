// @flow
/* global SETTINGS:false */
import React, { useState } from "react"
import R from "ramda"
import { useMutation } from "redux-query-react"

import Card from "./Card"
import Dialog from "./Dialog"
import DropdownMenu from "./DropdownMenu"

import { defaultResourceImageURL, embedlyThumbnail } from "../lib/url"
import {
  CAROUSEL_IMG_WIDTH,
  CAROUSEL_IMG_HEIGHT,
  readableLearningResources
} from "../lib/constants"
import { deleteUserListMutation } from "../lib/queries/user_lists"

import type { UserList } from "../flow/discussionTypes"

const readableLength = (length: number) =>
  length === 1 ? "1 Item" : `${String(length)} Items`

const userListCoverImage = R.pathOr(null, [
  "items",
  0,
  "content_data",
  "image_src"
])

type Props = {
  userList: UserList
}

function ConfirmDeleteDialog(props) {
  const { userList, close } = props

  const [, deleteUserList] = useMutation(deleteUserListMutation)

  return (
    <Dialog
      title={`Delete this ${readableLearningResources[userList.list_type]}?`}
      open={true}
      hideDialog={close}
      submitText="Delete"
      onAccept={() => {
        deleteUserList(userList)
        close()
      }}
    >
      Are you sure you want to delete this{" "}
      {readableLearningResources[userList.list_type]}?
    </Dialog>
  )
}

export default function UserListCard(props: Props) {
  const { userList } = props

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  return (
    <Card className="user-list-card">
      {showDeleteDialog ? (
        <ConfirmDeleteDialog
          userList={userList}
          close={() => setShowDeleteDialog(false)}
        />
      ) : null}
      <div className="userlist-info">
        <div className="platform">
          {readableLearningResources[userList.list_type]}
        </div>
        <div className="ul-title">{userList.title}</div>
        <div className="actions-and-count">
          <div className="count">{readableLength(userList.items.length)}</div>
          <i
            className="material-icons grey-surround more_vert"
            onClick={() => setShowMenu(true)}
          >
            more_vert
          </i>
          {showMenu ? (
            <DropdownMenu closeMenu={() => setShowMenu(false)}>
              <li>
                <div onClick={() => setShowDeleteDialog(true)}>Delete</div>
              </li>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
      {userList.items.length > 0 ? (
        <img
          src={embedlyThumbnail(
            SETTINGS.embedlyKey,
            userListCoverImage(userList) || defaultResourceImageURL(),
            CAROUSEL_IMG_HEIGHT,
            CAROUSEL_IMG_WIDTH
          )}
          height={CAROUSEL_IMG_HEIGHT}
          alt={`cover image for ${userList.title}`}
          className="cover-img"
        />
      ) : null}
    </Card>
  )
}
