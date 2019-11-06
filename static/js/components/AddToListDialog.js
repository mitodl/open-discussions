// @flow
import React, { useCallback } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useRequest, useMutation } from "redux-query-react"
import { createSelector } from "reselect"
import { Checkbox } from "@rmwc/checkbox"

import Dialog from "./Dialog"

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
import { filterItems, privacyIcon } from "../lib/learning_resources"
import { favoriteCourseMutation } from "../lib/queries/courses"
import { favoriteBootcampMutation } from "../lib/queries/bootcamps"
import { favoriteProgramMutation } from "../lib/queries/programs"
import {
  favoriteUserListMutation,
  userListMutation,
  userListsRequest,
  userListsSelector
} from "../lib/queries/user_lists"
import { favoriteVideoMutation } from "../lib/queries/videos"
import {
  learningResourceSelector,
  getResourceRequest
} from "../lib/queries/learning_resources"

const userListsFormSelector = createSelector(
  userListsSelector,
  userLists =>
    userLists ? Object.keys(userLists).map(key => userLists[key]) : []
)

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

  const userLists = useSelector(userListsFormSelector)
  const [{ isFinished: isFinishedList }] = useRequest(userListsRequest())

  const inLists =
    resource && isFinishedList && isFinishedResource
      ? filterItems(userLists, "items", {
        content_type: resource.object_type,
        object_id:    resource.id
      }).map(userList => userList.id)
      : []

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
        content_type: resource.object_type,
        object_id:    resource.id,
        delete:       remove
      }
    ]
    return userListMutation(list)
  })

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
      {userLists.map(
        (userList, i) =>
          resource &&
          (![LR_TYPE_LEARNINGPATH, LR_TYPE_USERLIST].includes(
            resource.object_type
          ) ||
            resource.id !== userList.id) ? (
              <div className="flex-row" key={i}>
                <div>
                  <Checkbox
                    checked={inLists.includes(userList.id)}
                    onChange={(e: any) => {
                      toggleListItem(resource, userList, !e.target.checked)
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
            ) : null
      )}
    </div>
  )

  return resource && isFinishedList && isFinishedResource ? (
    <Dialog
      id="list-add-dialog"
      open={!emptyOrNil(resource)}
      hideDialog={hide}
      title="Add to List"
      onAccept={hide}
      hideCancel={true}
      submitText="OK"
      className="user-listitem-dialog"
    >
      {renderAddToListForm()}
    </Dialog>
  ) : null
}
