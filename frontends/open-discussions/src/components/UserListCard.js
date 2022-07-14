// @flow
/* global SETTINGS:false */
import React, { useState } from "react"
import { useMutation } from "redux-query-react"
import { Link } from "react-router-dom"

import { Card } from "ol-util" 
import Dialog from "./Dialog"
import DropdownMenu from "./DropdownMenu"
import UserListFormDialog from "./UserListFormDialog"

import {
  defaultResourceImageURL,
  embedlyThumbnail,
  userListDetailURL
} from "../lib/url"
import {
  CAROUSEL_IMG_WIDTH,
  CAROUSEL_IMG_HEIGHT,
  readableLearningResources
} from "../lib/constants"
import { deleteUserListMutation } from "../lib/queries/user_lists"

import type { UserList } from "../flow/discussionTypes"

const readableLength = (length: number) =>
  length === 1 ? "1 Item" : `${String(length)} Items`

function ConfirmDeleteDialog(props) {
  const { userList, hide } = props

  const [, deleteUserList] = useMutation(deleteUserListMutation)

  return (
    <Dialog
      title={`Delete this ${readableLearningResources[userList.list_type]}?`}
      open={true}
      hideDialog={hide}
      submitText="Delete"
      onAccept={() => {
        deleteUserList(userList)
        hide()
      }}
    >
      Are you sure you want to delete this{" "}
      {readableLearningResources[userList.list_type]}?
    </Dialog>
  )
}

type Props = {
  userList: UserList,
  hideUserListOptions?: boolean
}

export default function UserListCard(props: Props) {
  const { userList, hideUserListOptions } = props

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  return (
    <Card className="user-list-card">
      {showDeleteDialog ? (
        <ConfirmDeleteDialog
          userList={userList}
          hide={() => setShowDeleteDialog(false)}
        />
      ) : null}
      {showEditDialog ? (
        <UserListFormDialog
          userList={userList}
          hide={() => setShowEditDialog(false)}
        />
      ) : null}
      <div className="userlist-info">
        <div className="platform">
          {readableLearningResources[userList.list_type]}
        </div>
        <Link to={userListDetailURL(userList.id)} className="ul-title">
          {userList.title}
        </Link>
        <div className="actions-and-count">
          <div className="count">{readableLength(userList.item_count)}</div>
          {hideUserListOptions ? null : (
            <i
              className="material-icons grey-surround more_vert"
              onClick={() => setShowMenu(true)}
            >
              more_vert
            </i>
          )}
          {showMenu ? (
            <DropdownMenu closeMenu={() => setShowMenu(false)}>
              <li>
                <div onClick={() => setShowDeleteDialog(true)}>Delete</div>
              </li>
              <li>
                <div onClick={() => setShowEditDialog(true)}>Edit</div>
              </li>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
      {userList.item_count > 0 ? (
        <img
          src={embedlyThumbnail(
            SETTINGS.embedlyKey,
            userList.image_src || defaultResourceImageURL(),
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
