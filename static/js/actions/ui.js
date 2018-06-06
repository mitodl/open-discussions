// @flow
import { createAction } from "redux-actions"

export const DIALOG_REMOVE_POST = "DIALOG_REMOVE_POST"
export const DIALOG_REMOVE_COMMENT = "DIALOG_REMOVE_COMMENT"
export const DIALOG_PROFILE_IMAGE = "DIALOG_PROFILE_IMAGE"

export const SET_SHOW_DRAWER_DESKTOP = "SET_SHOW_DRAWER_DESKTOP"
export const setShowDrawerDesktop = createAction(SET_SHOW_DRAWER_DESKTOP)

export const SET_SHOW_DRAWER_MOBILE = "SET_SHOW_DRAWER_MOBILE"
export const setShowDrawerMobile = createAction(SET_SHOW_DRAWER_MOBILE)

export const SET_SNACKBAR_MESSAGE = "SET_SNACKBAR_MESSAGE"
export const setSnackbarMessage = createAction(SET_SNACKBAR_MESSAGE)

export const SHOW_DIALOG = "SHOW_DIALOG"
export const showDialog = createAction(SHOW_DIALOG)

export const HIDE_DIALOG = "HIDE_DIALOG"
export const hideDialog = createAction(HIDE_DIALOG)

export const SET_SHOW_USER_MENU = "SET_SHOW_USER_MENU"
export const setShowUserMenu = createAction(SET_SHOW_USER_MENU)
