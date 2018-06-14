// @flow
import * as api from "../lib/api"
import { GET, PATCH, INITIAL_STATE } from "redux-hammock/constants"

import type { Profile } from "../flow/discussionTypes"
import { updateProfileImage } from "../lib/api"
import {
  receivePatchUserPhotoFailure,
  receivePatchUserPhotoSuccess,
  requestPatchUserPhoto
} from "../actions/image_upload"
import type { Dispatcher } from "../flow/reduxTypes"
import { Dispatch } from "redux"

const updateProfileHandler = (
  payload: Profile,
  data: Map<string, Profile>
): Map<string, Profile> => {
  const update = new Map(data)
  update.set(payload.username, payload)
  return update
}

export const profilesEndpoint = {
  name:              "profiles",
  verbs:             [GET, PATCH],
  initialState:      { ...INITIAL_STATE, data: new Map() },
  getFunc:           (username: string) => api.getProfile(username),
  getSuccessHandler: updateProfileHandler,
  patchFunc:         (username: string, image: Blob, name: string) =>
    api.updateProfileImage(username, image, name),
  patchSuccessHandler: updateProfileHandler
}

export function updateProfilePhoto(
  username: string,
  image: Blob,
  name: string
): Dispatcher<string | void> {
  return (dispatch: Dispatch) => {
    dispatch(requestPatchUserPhoto(username))
    return updateProfileImage(username, image, name).then(
      () => {
        dispatch(receivePatchUserPhotoSuccess())
      },
      error => {
        dispatch(receivePatchUserPhotoFailure(error))
      }
    )
  }
}
