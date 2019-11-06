// @flow
import React from "react"
import { connect, useDispatch, useSelector } from "react-redux"
import { useRequest } from "redux-query-react"
import { mutateAsync } from "redux-query"
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

import type { LearningResource, UserList } from "../flow/discussionTypes"
import { getResourceSelectorAndRequest } from "../lib/queries/learning_resources"

type Props = {
  object: ?LearningResource
}

const userListsFormSelector = createSelector(
  userListsSelector,
  userLists =>
    userLists ? Object.keys(userLists).map(key => userLists[key]) : []
)

export function AddToListDialog(props: Props) {
  const { object } = props
  const dispatch = useDispatch()

  if (!object) {
    return null
  }

  const [objectSelector, objectRequest] = getResourceSelectorAndRequest(object)
  const [{ isFinished: isFinishedResource }] = useRequest(
    objectRequest(object.id)
  )
  const resource = useSelector(objectSelector)(object.id)
  const userLists = useSelector(userListsFormSelector)
  const [{ isFinished: isFinishedList }] = useRequest(userListsRequest())

  const inLists =
    resource && isFinishedList && isFinishedResource
      ? filterItems(userLists, "items", {
        content_type: resource.object_type,
        object_id:    resource.id
      }).map(userList => userList.id)
      : []

  const hide = () => {
    dispatch(hideDialog(DIALOG_ADD_TO_LIST))
  }

  const toggleFavorite = resource => {
    if (resource.object_type === LR_TYPE_COURSE) {
      dispatch(mutateAsync(favoriteCourseMutation(resource)))
    }
    if (resource.object_type === LR_TYPE_BOOTCAMP) {
      dispatch(mutateAsync(favoriteBootcampMutation(resource)))
    }
    if (resource.object_type === LR_TYPE_PROGRAM) {
      dispatch(mutateAsync(favoriteProgramMutation(resource)))
    }
    if (
      [LR_TYPE_USERLIST, LR_TYPE_LEARNINGPATH].includes(resource.object_type)
    ) {
      dispatch(mutateAsync(favoriteUserListMutation(resource)))
    }
    if (resource.object_type === LR_TYPE_VIDEO) {
      dispatch(mutateAsync(favoriteVideoMutation(resource)))
    }
  }

  const toggleListItem = (
    resource: LearningResource,
    list: UserList,
    remove: boolean
  ) => {
    list.items = [
      {
        content_type: resource.object_type,
        object_id:    resource.id,
        delete:       remove
      }
    ]
    dispatch(mutateAsync(userListMutation(list)))
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

export const mapStateToProps = (state: Object) => {
  const { ui } = state
  return {
    object: ui.dialogs.get(DIALOG_ADD_TO_LIST)
  }
}

export default connect<Props, _, _, _, _, _>(mapStateToProps)(AddToListDialog)
