
import { createAction } from "redux-actions";

export const DIALOG_REMOVE_POST = "DIALOG_REMOVE_POST";
export const DIALOG_DELETE_POST = "DIALOG_DELETE_POST";
export const DIALOG_REMOVE_COMMENT = "DIALOG_REMOVE_COMMENT";
export const DIALOG_REMOVE_MEMBER = "DIALOG_REMOVE_MEMBER";
export const DIALOG_CLEAR_POST_TYPE = "DIALOG_CLEAR_POST_TYPE";
export const DIALOG_EDIT_WIDGET = "DIALOG_EDIT_WIDGET";
export const DIALOG_ADD_TO_LIST = "DIALOG_ADD_TO_LIST";

export const SET_SHOW_DRAWER_DESKTOP = "SET_SHOW_DRAWER_DESKTOP";
export const setShowDrawerDesktop = createAction<string, any>(SET_SHOW_DRAWER_DESKTOP);

export const SET_SHOW_DRAWER_MOBILE = "SET_SHOW_DRAWER_MOBILE";
export const setShowDrawerMobile = createAction<string, any>(SET_SHOW_DRAWER_MOBILE);

export const SET_SHOW_DRAWER_HOVER = "SET_SHOW_DRAWER_HOVER";
export const setShowDrawerHover = createAction<string, any>(SET_SHOW_DRAWER_HOVER);

export const PUSH_LR_HISTORY = "PUSH_LR_HISTORY";
export const pushLRHistory = createAction<string, any>(PUSH_LR_HISTORY);

export const POP_LR_HISTORY = "POP_LR_HISTORY";
export const popLRHistory = createAction<string, any>(POP_LR_HISTORY);

export const CLEAR_LR_HISTORY = "CLEAR_LR_HISTORY";
export const clearLRHistory = createAction<string, any>(CLEAR_LR_HISTORY);

export const SET_SNACKBAR_MESSAGE = "SET_SNACKBAR_MESSAGE";
export const setSnackbarMessage = createAction<string, any>(SET_SNACKBAR_MESSAGE);

export const SET_BANNER_MESSAGE = "SET_BANNER_MESSAGE";
export const setBannerMessage = createAction<string, any>(SET_BANNER_MESSAGE);

export const HIDE_BANNER = "HIDE_BANNER";
export const hideBanner = createAction<string, any>(HIDE_BANNER);

export const SHOW_DIALOG = "SHOW_DIALOG";
export const showDialog = createAction<string, any>(SHOW_DIALOG);

export const HIDE_DIALOG = "HIDE_DIALOG";
export const hideDialog = createAction<string, any>(HIDE_DIALOG);

export const SET_DIALOG_DATA = "SET_DIALOG_DATA";
export const setDialogData = createAction<string, any>(SET_DIALOG_DATA);

export const SHOW_DROPDOWN = "SHOW_DROPDOWN";
export const showDropdown = createAction<string, any>(SHOW_DROPDOWN);

export const HIDE_DROPDOWN = "HIDE_DROPDOWN";
export const hideDropdown = createAction<string, any>(HIDE_DROPDOWN);

export const SET_AUTH_USER_DETAIL = "SET_AUTH_USER_DETAIL";
export const setAuthUserDetail = createAction<string, any>(SET_AUTH_USER_DETAIL);

// this is a hack :/
// needed to debounce just a little bit to get around a race
// condition with the post dropdown menu
export const hideDropdownDebounced = createAction<string, any, any, any>(HIDE_DROPDOWN, i => i, () => ({ debounce: { time: 100 } }));