// @flow
import React from "react"
import { connect, useSelector } from "react-redux"
import { connectRequest, useRequest } from "redux-query-react"
import { mutateAsync } from "redux-query"
import { createSelector } from "reselect"
import { withRouter } from "react-router"
import R from "ramda"
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
import { courseRequest, favoriteCourseMutation } from "../lib/queries/courses"
import {
  bootcampRequest,
  favoriteBootcampMutation
} from "../lib/queries/bootcamps"
import {
  favoriteProgramMutation,
  programRequest
} from "../lib/queries/programs"
import {
  favoriteUserListMutation,
  userListMutation,
  userListRequest,
  userListsRequest,
  userListsSelector
} from "../lib/queries/user_lists"
import { favoriteVideoMutation, videoRequest } from "../lib/queries/videos"

import type { Dispatch } from "redux"
import type { LearningResource, UserList } from "../flow/discussionTypes"
import { getQuerySelector } from "../lib/queries/learning_resources"

type StateProps = {|
  resource: ?LearningResource
|}

type DispatchProps = {|
  toggleFavorite: Function,
  toggleListItem: Function,
  hideDialog: Function,
  dispatch: Dispatch<*>
|}

type Props = {|
  ...DispatchProps,
  ...StateProps
|}

const userListsFormSelector = createSelector(
  userListsSelector,
  userLists =>
    userLists ? Object.keys(userLists).map(key => userLists[key]) : []
)

export function AddToListDialog(props: Props) {
  const { resource, toggleFavorite, toggleListItem, hideDialog } = props
  const userLists = useSelector(userListsFormSelector)
  const [{ isFinished }] = useRequest(userListsRequest())

  const inLists =
    resource && isFinished
      ? filterItems(userLists, "items", {
        content_type: resource.object_type,
        object_id:    resource.id
      }).map(userList => userList.id)
      : []

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
  return resource && isFinished ? (
    <Dialog
      id="list-add-dialog"
      open={!emptyOrNil(resource)}
      hideDialog={hideDialog}
      title="Add to List"
      onAccept={hideDialog}
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
  const object = ui.dialogs.get(DIALOG_ADD_TO_LIST)
  const objectId = object ? object.id : null
  const objectType = object ? object.object_type : null
  const resourceFilter = getQuerySelector(state, object)

  return {
    objectId,
    objectType,
    resource: resourceFilter(state)
  }
}

const mapDispatchToProps = dispatch => ({
  hideDialog: () => {
    dispatch(hideDialog(DIALOG_ADD_TO_LIST))
  },
  toggleFavorite: resource => {
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
  },
  toggleListItem: (
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
})

const mapPropsToConfig = props => {
  const { objectType, objectId } = props

  switch (objectType) {
  case LR_TYPE_COURSE:
    return [courseRequest(objectId)]
  case LR_TYPE_BOOTCAMP:
    return [bootcampRequest(objectId)]
  case LR_TYPE_PROGRAM:
    return [programRequest(objectId)]
  case LR_TYPE_USERLIST:
    return [userListRequest(objectId)]
  case LR_TYPE_LEARNINGPATH:
    return [userListRequest(objectId)]
  case LR_TYPE_VIDEO:
    return [videoRequest(objectId)]
  }
  return []
}

export default R.compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  withRouter,
  connectRequest(mapPropsToConfig)
)(AddToListDialog)
