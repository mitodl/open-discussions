// @flow
import { createAction } from "redux-actions"

export const DIALOG_REMOVE_POST = "DIALOG_REMOVE_POST"
export const DIALOG_DELETE_POST = "DIALOG_DELETE_POST"
export const DIALOG_REMOVE_COMMENT = "DIALOG_REMOVE_COMMENT"
export const DIALOG_REMOVE_MEMBER = "DIALOG_REMOVE_MEMBER"
export const DIALOG_CLEAR_POST_TYPE = "DIALOG_CLEAR_POST_TYPE"
export const DIALOG_EDIT_WIDGET = "DIALOG_EDIT_WIDGET"

export const SET_SHOW_DRAWER_DESKTOP = "SET_SHOW_DRAWER_DESKTOP"
export const setShowDrawerDesktop = createAction<string, *>(
  SET_SHOW_DRAWER_DESKTOP
)

export const SET_SHOW_DRAWER_MOBILE = "SET_SHOW_DRAWER_MOBILE"
export const setShowDrawerMobile = createAction<string, *>(
  SET_SHOW_DRAWER_MOBILE
)

export const SET_SHOW_COURSE_DRAWER = "SET_SHOW_COURSE_DRAWER"
export const setShowCourseDrawer = createAction<string, *>(
  SET_SHOW_COURSE_DRAWER
)

export const SET_SNACKBAR_MESSAGE = "SET_SNACKBAR_MESSAGE"
export const setSnackbarMessage = createAction<string, *>(SET_SNACKBAR_MESSAGE)

export const SET_BANNER_MESSAGE = "SET_BANNER_MESSAGE"
export const setBannerMessage = createAction<string, *>(SET_BANNER_MESSAGE)

export const HIDE_BANNER = "HIDE_BANNER"
export const hideBanner = createAction<string, *>(HIDE_BANNER)

export const SHOW_DIALOG = "SHOW_DIALOG"
export const showDialog = createAction<string, *>(SHOW_DIALOG)

export const HIDE_DIALOG = "HIDE_DIALOG"
export const hideDialog = createAction<string, *>(HIDE_DIALOG)

export const SET_DIALOG_DATA = "SET_DIALOG_DATA"
export const setDialogData = createAction<string, *>(SET_DIALOG_DATA)

export const SHOW_DROPDOWN = "SHOW_DROPDOWN"
export const showDropdown = createAction<string, *>(SHOW_DROPDOWN)

export const HIDE_DROPDOWN = "HIDE_DROPDOWN"
export const hideDropdown = createAction<string, *>(HIDE_DROPDOWN)

export const SET_AUTH_USER_DETAIL = "SET_AUTH_USER_DETAIL"
export const setAuthUserDetail = createAction<string, *>(SET_AUTH_USER_DETAIL)

export const SHOW_SEARCH_FACETS = "SHOW_SEARCH_FACETS"
export const showSearchFacets = createAction<string, *>(SHOW_SEARCH_FACETS)

export const HIDE_SEARCH_FACETS = "HIDE_SEARCH_FACETS"
export const hideSearchFacets = createAction<string, *>(HIDE_SEARCH_FACETS)

// this is a hack :/
// needed to debounce just a little bit to get around a race
// condition with the post dropdown menu
export const hideDropdownDebounced = createAction<string, *, *, *>(
  HIDE_DROPDOWN,
  i => i,
  () => ({ debounce: { time: 100 } })
)
