// @flow
import React from "react"
import { connect, useSelector } from "react-redux"
import { connectRequest, useRequest } from "redux-query-react"
import { mutateAsync, querySelectors } from "redux-query"
import { createSelector } from "reselect"
import { withRouter } from "react-router"
import R from "ramda"
import { Checkbox } from "@rmwc/checkbox"

import Card from "./Card"
import Dialog from "./Dialog"

import { DIALOG_ADD_TO_LIST, hideDialog } from "../actions/ui"
import { capitalize, emptyOrNil } from "../lib/util"
import {
  LR_TYPE_BOOTCAMP,
  LR_TYPE_COURSE,
  LR_TYPE_PROGRAM,
  LR_TYPE_USERLIST, LR_TYPE_VIDEO
} from "../lib/constants"
import { filterItems } from "../lib/learning_resources"
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
  userListItemsMutation,
  userListRequest,
  userListsRequest,
  userListsSelector
} from "../lib/queries/user_lists"
import {favoriteVideoMutation, videoRequest} from "../lib/queries/videos"

import type { Dispatch } from "redux"
import type { LearningResource, UserList } from "../flow/discussionTypes"


type StateProps = {|
  objectId: ?number,
  objectType: ?string,
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
    userLists ? Object.keys(userLists).map(key => userLists[key]) : null
)

export function AddToListDialog(props: Props) {
  const { resource, toggleFavorite, toggleListItem, hideDialog } = props

  const userLists = useSelector(userListsFormSelector)
  const [{ isFinished }] = useRequest(userListsRequest())

  const inLists =
    isFinished && resource
      ? filterItems(userLists, "items", {
        content_type: resource.object_type,
        object_id:    resource.id
      }).map(item => item.id)
      : []

  return isFinished && resource ? (
    <Dialog
      id="list-add-dialog"
      open={!emptyOrNil(resource)}
      hideDialog={hideDialog}
      title="Add to List"
      onAccept={hideDialog}
      submitText="Close"
      hideCancel={true}
    >
      <Card className="column3">
        <div>
          <div className="flex-row" key="99">
            <Checkbox
              checked={resource.is_favorite}
              onChange={() => toggleFavorite(resource)}
            >
              Favorites
            </Checkbox>
            <div className="privacy-level">Private</div>
          </div>
          {userLists.map((list, i) => (
            <div className="flex-row" key={i}>
              <Checkbox
                checked={inLists.includes(list.id)}
                onChange={() =>
                  toggleListItem(resource, list, inLists.includes(list.id))
                }
              >
                {`${list.title}`}
              </Checkbox>
              <div className="privacy-level">
                {capitalize(list.privacy_level)}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </Dialog>
  ) : null
}

const getObject = createSelector(
  state => state.ui,
  state => state.entities.courses,
  state => state.entities.bootcamps,
  state => state.entities.programs,
  state => state.entities.userLists,
  state => state.queries,
  (ui, courses, bootcamps, programs, userLists, queries) => {
    const object = ui.dialogs.get(DIALOG_ADD_TO_LIST)
    if (object && object.object_type) {
      switch (object.object_type) {
      case LR_TYPE_COURSE:
        return querySelectors.isFinished(queries, courseRequest(object.id))
          ? courses[object.id]
          : null
      case LR_TYPE_BOOTCAMP:
        return querySelectors.isFinished(queries, bootcampRequest(object.id))
          ? bootcamps[object.id]
          : null
      case LR_TYPE_PROGRAM:
        return querySelectors.isFinished(queries, programRequest(object.id))
          ? programs[object.id]
          : null
      case LR_TYPE_USERLIST:
        return querySelectors.isFinished(queries, userListRequest(object.id))
          ? userLists[object.id]
          : null
      }
    }
    return null
  }
)

export const mapStateToProps = (state: Object) => {
  const { ui } = state
  const object = ui.dialogs.get(DIALOG_ADD_TO_LIST)
  const objectId = object ? object.id : null
  const objectType = object ? object.object_type : null

  return {
    objectId,
    objectType,
    resource: getObject(state)
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
    if (resource.object_type === LR_TYPE_USERLIST) {
      dispatch(mutateAsync(favoriteUserListMutation(resource)))
    }
    if (resource.object_type === LR_TYPE_VIDEO) {
      dispatch(mutateAsync(favoriteVideoMutation(resource)))
    }
    //
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
    dispatch(mutateAsync(userListItemsMutation(list)))
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
