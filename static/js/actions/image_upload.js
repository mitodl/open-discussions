// @flow
import { createAction } from "redux-actions"

export const START_PHOTO_EDIT = "START_PHOTO_EDIT"
export const startPhotoEdit = createAction(START_PHOTO_EDIT)

export const CLEAR_PHOTO_EDIT = "CLEAR_PHOTO_EDIT"
export const clearPhotoEdit = createAction(CLEAR_PHOTO_EDIT)

export const UPDATE_PHOTO_EDIT = "UPDATE_PHOTO_EDIT"
export const updatePhotoEdit = createAction(UPDATE_PHOTO_EDIT)

export const SET_PHOTO_ERROR = "SET_PHOTO_ERROR"
export const setPhotoError = createAction(SET_PHOTO_ERROR)

export const REQUEST_PATCH_PHOTO = "REQUEST_PATCH_PHOTO"
export const requestPatchPhoto = createAction(REQUEST_PATCH_PHOTO)

export const RECEIVE_PATCH_PHOTO_FAILURE = "RECEIVE_PATCH_PHOTO_FAILURE"
export const receivePatchPhotoFailure = createAction(
  RECEIVE_PATCH_PHOTO_FAILURE
)

export const RECEIVE_PATCH_PHOTO_SUCCESS = "RECEIVE_PATCH_PHOTO_SUCCESS"
export const receivePatchPhotoSuccess = createAction(
  RECEIVE_PATCH_PHOTO_SUCCESS
)
