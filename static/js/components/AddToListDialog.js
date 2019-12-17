// @flow
import React, { useState, useCallback } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useRequest, useMutation } from "redux-query-react"
import { createSelector } from "reselect"
import { Checkbox } from "@rmwc/checkbox"
import { find, propEq } from "ramda"

import Dialog from "./Dialog"
import UserListFormDialog from "./UserListFormDialog"

import { DIALOG_ADD_TO_LIST, hideDialog } from "../actions/ui"
import { capitalize, emptyOrNil } from "../lib/util"
import {
  LR_TYPE_BOOTCAMP,
  LR_TYPE_COURSE,
  LR_TYPE_LEARNINGPATH,
  LR_TYPE_PROGRAM,
  LR_TYPE_USERLIST,
  LR_TYPE_VIDEO
} from "../lib/constants"
import { isUserList, privacyIcon } from "../lib/learning_resources"
import { favoriteCourseMutation } from "../lib/queries/courses"
import { favoriteBootcampMutation } from "../lib/queries/bootcamps"
import { favoriteProgramMutation } from "../lib/queries/programs"
import {
  favoriteUserListMutation,
  userListMutation,
  userListsRequest,
  myUserListsSelector
} from "../lib/queries/user_lists"
import { favoriteVideoMutation } from "../lib/queries/videos"
import {
  learningResourceSelector,
  getResourceRequest
} from "../lib/queries/learning_resources"

const uiDialogSelector = createSelector(
  state => state.ui,
  ui => ui.dialogs.get(DIALOG_ADD_TO_LIST) || {}
)

export default function AddToListDialog() {
  const { id: objectId, object_type: objectType } = useSelector(
    uiDialogSelector
  )

  const [{ isFinished: isFinishedResource }] = useRequest(
    getResourceRequest(objectId, objectType)
  )

  const resource = useSelector(learningResourceSelector)(objectId, objectType)
  const [showUserListFormDialog, setShowUserListFormDialog] = useState(false)

  const userLists = useSelector(myUserListsSelector)
  const [{ isFinished: isFinishedList }] = useRequest(userListsRequest())

  const inLists = (resource && isFinishedResource ? resource.lists : []).map(
    listitem => listitem.list_id
  )

  const dispatch = useDispatch()
  const hide = useCallback(
    () => {
      dispatch(hideDialog(DIALOG_ADD_TO_LIST))
    },
    [dispatch]
  )

  const [, toggleFavorite] = useMutation(resource => {
    switch (resource.object_type) {
    case LR_TYPE_COURSE:
      return favoriteCourseMutation(resource)
    case LR_TYPE_BOOTCAMP:
      return favoriteBootcampMutation(resource)
    case LR_TYPE_PROGRAM:
      return favoriteProgramMutation(resource)
    case LR_TYPE_VIDEO:
      return favoriteVideoMutation(resource)
    default:
      return favoriteUserListMutation(resource)
    }
  })

  const [, toggleListItem] = useMutation((resource, list, remove) => {
    list.items = [
      {
        content_type:
          resource.object_type === LR_TYPE_LEARNINGPATH
            ? LR_TYPE_USERLIST
            : resource.object_type,
        object_id: resource.id,
        delete:    remove
      }
    ]
    return userListMutation(list)
  })

  const updateResource = (checked: boolean, userListId) => {
    const matchingList = find(propEq("list_id", userListId), resource.lists)
    if (checked && !matchingList) {
      resource.lists.push({ list_id: userListId })
    } else if (matchingList && !checked) {
      resource.lists.splice(resource.lists.indexOf(matchingList), 1)
    }
  }

  const renderAddToListForm = () => (
    <div className="user-listitem-form">
      <div className="flex-row">
        <div>
          <Checkbox
            checked={resource ? resource.is_favorite : false}
            onChange={() => toggleFavorite(resource)}
          >
            Favorites
          </Checkbox>
        </div>
        <div>
          <div className="grey-surround privacy">
            <i className="material-icons lock">lock</i>
            Private
          </div>
        </div>
      </div>
      {resource && !isUserList(resource.object_type) ? (
        <React.Fragment>
          {userLists.map((userList, i) => (
            <div className="flex-row" key={i}>
              <div>
                <Checkbox
                  checked={inLists.includes(userList.id)}
                  onChange={(e: any) => {
                    toggleListItem(resource, userList, !e.target.checked)
                    updateResource(e.target.checked, userList.id)
                  }}
                >
                  {`${userList.title}`}
                </Checkbox>
              </div>
              <div>
                <div className="grey-surround privacy">
                  <i
                    className={`material-icons ${privacyIcon(
                      userList.privacy_level
                    )}`}
                  >
                    {privacyIcon(userList.privacy_level)}
                  </i>
                  {capitalize(userList.privacy_level)}
                </div>
              </div>
            </div>
          ))}

          <button
            className="create-new-list blue-btn"
            onClick={() => setShowUserListFormDialog(true)}
          >
            Create New List
          </button>
        </React.Fragment>
      ) : null}
    </div>
  )

  return resource && isFinishedList && isFinishedResource ? (
    <React.Fragment>
      <Dialog
        id="list-add-dialog"
        open={!emptyOrNil(resource)}
        hideDialog={showUserListFormDialog ? null : hide}
        title="Add to List"
        onAccept={hide}
        noButtons
        submitText="OK"
        className="user-listitem-dialog"
      >
        {renderAddToListForm()}
      </Dialog>
      {showUserListFormDialog ? (
        <UserListFormDialog hide={() => setShowUserListFormDialog(false)} />
      ) : null}
    </React.Fragment>
  ) : null
}
