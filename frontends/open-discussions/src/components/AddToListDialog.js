// @flow
import React, { useState, useCallback } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useRequest, useMutation } from "redux-query-react"
import { createSelector } from "reselect"
import { Checkbox } from "@rmwc/checkbox"
import { indexBy, prop, find, propEq } from "ramda"

import Dialog from "./Dialog"
import UserListFormDialog from "./UserListFormDialog"

import { DIALOG_ADD_TO_LIST, hideDialog } from "../actions/ui"
import { capitalize, emptyOrNil } from "../lib/util"
import {
  LR_TYPE_COURSE,
  LR_TYPE_PROGRAM,
  LR_TYPE_VIDEO,
  LR_TYPE_PODCAST,
  LR_TYPE_PODCAST_EPISODE
} from "../lib/constants"
import { isUserList, privacyIcon } from "../lib/learning_resources"
import { favoriteCourseMutation } from "../lib/queries/courses"
import { favoriteProgramMutation } from "../lib/queries/programs"
import {
  favoriteUserListMutation,
  userListsRequest,
  myUserListsSelector
} from "../lib/queries/user_lists"
import {
  createUserListItemMutation,
  deleteUserListItemMutation
} from "../lib/queries/user_list_items"
import { favoriteVideoMutation } from "../lib/queries/videos"
import {
  favoritePodcastMutation,
  favoritePodcastEpisodeMutation
} from "../lib/queries/podcasts"
import {
  learningResourceSelector,
  getResourceRequest
} from "../lib/queries/learning_resources"

const uiDialogSelector = createSelector(
  state => state.ui,
  ui => ui.dialogs.get(DIALOG_ADD_TO_LIST) || {}
)

const listsById = indexBy(prop("list_id"))

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

  const listItemsById = listsById(
    resource && isFinishedResource ? resource.lists : []
  )

  const dispatch = useDispatch()
  const hide = useCallback(() => {
    dispatch(hideDialog(DIALOG_ADD_TO_LIST))
  }, [dispatch])

  const [, toggleFavorite] = useMutation(resource => {
    switch (resource.object_type) {
    case LR_TYPE_COURSE:
      return favoriteCourseMutation(resource)
    case LR_TYPE_PROGRAM:
      return favoriteProgramMutation(resource)
    case LR_TYPE_VIDEO:
      return favoriteVideoMutation(resource)
    case LR_TYPE_PODCAST:
      return favoritePodcastMutation(resource)
    case LR_TYPE_PODCAST_EPISODE:
      return favoritePodcastEpisodeMutation(resource)
    default:
      return favoriteUserListMutation(resource)
    }
  })

  const [, toggleListItem] = useMutation((resource, list, item, remove) => {
    return remove
      ? deleteUserListItemMutation(list.id, item)
      : createUserListItemMutation(list.id, resource)
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
          {userLists.map((userList, i) => {
            const listItem = listItemsById[userList.id]
            return (
              <div className="flex-row" key={i}>
                <div>
                  <Checkbox
                    checked={!!listItem}
                    onChange={(e: any) => {
                      toggleListItem(
                        resource,
                        userList,
                        listItem,
                        !e.target.checked
                      )
                      updateResource(e.target.checked, userList.id)
                    }}
                    disabled={listItem && !listItem.item_id}
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
            )
          })}

          <button
            className="create-new-list blue-btn"
            onClick={() => setShowUserListFormDialog(true)}
            onKeyPress={e => {
              if (e.key === "Enter") {
                setShowUserListFormDialog(true)
              }
            }}
            tabIndex="0"
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
