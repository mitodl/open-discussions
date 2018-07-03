// @flow
import R from "ramda"

import {
  SET_SHOW_DRAWER_DESKTOP,
  SET_SHOW_DRAWER_MOBILE,
  SET_SNACKBAR_MESSAGE,
  SET_BANNER_MESSAGE,
  HIDE_BANNER,
  SHOW_DIALOG,
  HIDE_DIALOG,
  SHOW_DROPDOWN,
  HIDE_DROPDOWN,
  SET_DIALOG_DATA
} from "../actions/ui"

import type { Action } from "../flow/reduxTypes"

export type SnackbarState = {
  id: number,
  message: string,
  actionText: ?string,
  timeout: ?number
}

export type BannerState = {
  message: string,
  visible: boolean
}

export type UIState = {
  showDrawerDesktop: boolean,
  showDrawerMobile: boolean,
  snackbar: ?SnackbarState,
  banner: BannerState,
  dialogs: Map<string, any>,
  dropdownMenus: Set<string>
}

const INITIAL_BANNER_STATE = {
  message: "",
  visible: false
}

export const INITIAL_UI_STATE: UIState = {
  showDrawerDesktop: true,
  showDrawerMobile:  false,
  snackbar:          null,
  banner:            INITIAL_BANNER_STATE,
  dialogs:           new Map(),
  dropdownMenus:     new Set()
}

// this generates a new sequential id for each snackbar state that is pushed
// this ensures the snack will display for each message even if they repeat
const nextSnackbarId = (snackbar: ?SnackbarState): number =>
  snackbar ? snackbar.id + 1 : 0

const updateVisibilityMap = (
  dialogs: Map<string, any>,
  dialogKey: string,
  show: boolean
) => {
  const copy: Map<string, any> = new Map(dialogs)
  copy.delete(dialogKey)
  if (show) {
    copy.set(dialogKey, null)
  }
  return copy
}

const updateVisibilitySet = (
  visibilitySet: Set<string>,
  key: string,
  show: boolean
) =>
  show
    ? new Set([...visibilitySet, key])
    : new Set([...visibilitySet].filter(R.complement(R.equals)(key)))

const setDialogData = (
  dialogs: Map<string, any>,
  dialogKey: string,
  data: any
) => {
  const copy: Map<string, any> = new Map(dialogs)
  copy.set(dialogKey, data)
  return copy
}

export const ui = (
  state: UIState = INITIAL_UI_STATE,
  action: Action<any, null>
): UIState => {
  switch (action.type) {
  case SET_SHOW_DRAWER_DESKTOP:
    return { ...state, showDrawerDesktop: action.payload }
  case SET_SHOW_DRAWER_MOBILE:
    return { ...state, showDrawerMobile: action.payload }
  case SET_SNACKBAR_MESSAGE:
    return {
      ...state,
      snackbar: {
        ...action.payload,
        id: nextSnackbarId(state.snackbar)
      }
    }
  case SET_BANNER_MESSAGE:
    return {
      ...state,
      banner: {
        message: action.payload,
        visible: true
      }
    }
  case HIDE_BANNER:
    return {
      ...state,
      banner: {
        message: "",
        visible: false
      }
    }
  case SHOW_DIALOG:
    return {
      ...state,
      dialogs: updateVisibilityMap(state.dialogs, action.payload, true)
    }
  case HIDE_DIALOG:
    return {
      ...state,
      dialogs: updateVisibilityMap(state.dialogs, action.payload, false)
    }
  case SET_DIALOG_DATA:
    return {
      ...state,
      dialogs: setDialogData(
        state.dialogs,
        action.payload.dialogKey,
        action.payload.data
      )
    }
  case SHOW_DROPDOWN:
    return {
      ...state,
      dropdownMenus: updateVisibilitySet(
        state.dropdownMenus,
        action.payload,
        true
      )
    }
  case HIDE_DROPDOWN:
    return {
      ...state,
      dropdownMenus: updateVisibilitySet(
        state.dropdownMenus,
        action.payload,
        false
      )
    }
  }
  return state
}
