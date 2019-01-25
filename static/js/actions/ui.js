// @flow
import { createAction } from "redux-actions"

export const DIALOG_REMOVE_POST = "DIALOG_REMOVE_POST"
export const DIALOG_REMOVE_COMMENT = "DIALOG_REMOVE_COMMENT"
export const DIALOG_REMOVE_MEMBER = "DIALOG_REMOVE_MEMBER"
export const DIALOG_CLEAR_POST_TYPE = "DIALOG_CLEAR_POST_TYPE"
export const DIALOG_EDIT_WIDGET = "DIALOG_EDIT_WIDGET"

export const SET_SHOW_DRAWER_DESKTOP = "SET_SHOW_DRAWER_DESKTOP"
export const setShowDrawerDesktop = createAction(SET_SHOW_DRAWER_DESKTOP)

export const SET_SHOW_DRAWER_MOBILE = "SET_SHOW_DRAWER_MOBILE"
export const setShowDrawerMobile = createAction(SET_SHOW_DRAWER_MOBILE)

export const SET_SNACKBAR_MESSAGE = "SET_SNACKBAR_MESSAGE"
export const setSnackbarMessage = createAction(SET_SNACKBAR_MESSAGE)

export const SET_BANNER_MESSAGE = "SET_BANNER_MESSAGE"
export const setBannerMessage = createAction(SET_BANNER_MESSAGE)

export const HIDE_BANNER = "HIDE_BANNER"
export const hideBanner = createAction(HIDE_BANNER)

export const SHOW_DIALOG = "SHOW_DIALOG"
export const showDialog = createAction(SHOW_DIALOG)

export const HIDE_DIALOG = "HIDE_DIALOG"
export const hideDialog = createAction(HIDE_DIALOG)

export const SET_DIALOG_DATA = "SET_DIALOG_DATA"
export const setDialogData = createAction(SET_DIALOG_DATA)

export const SHOW_DROPDOWN = "SHOW_DROPDOWN"
export const showDropdown = createAction(SHOW_DROPDOWN)

export const HIDE_DROPDOWN = "HIDE_DROPDOWN"
export const hideDropdown = createAction(HIDE_DROPDOWN)

export const SET_AUTH_USER_DETAIL = "SET_AUTH_USER_DETAIL"
export const setAuthUserDetail = createAction(SET_AUTH_USER_DETAIL)

// this is a hack :/
// needed to debounce just a little bit to get around a race
// condition with the post dropdown menu
export const hideDropdownDebounced = createAction(
  HIDE_DROPDOWN,
  i => i,
  () => ({ debounce: { time: 100, key: HIDE_DROPDOWN } })
)
