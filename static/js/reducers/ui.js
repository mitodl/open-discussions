// @flow
import R from "ramda"

import {
  SET_SHOW_DRAWER,
  SET_SNACKBAR_MESSAGE,
  SHOW_DIALOG,
  HIDE_DIALOG,
  SET_SHOW_USER_MENU
} from "../actions/ui"

import type { Action } from "../flow/reduxTypes"

export type SnackbarState = {
  id: number,
  message: string,
  actionText: ?string,
  timeout: ?number
}

export type UIState = {
  showDrawer: boolean,
  snackbar: ?SnackbarState,
  dialogs: Set<string>,
  showUserMenu: boolean
}

export const INITIAL_UI_STATE: UIState = {
  showDrawer:   false,
  snackbar:     null,
  dialogs:      new Set(),
  showUserMenu: false
}

// this generates a new sequential id for each snackbar state that is pushed
// this ensures the snack will display for each message even if they repeat
const nextSnackbarId = (snackbar: ?SnackbarState): number =>
  snackbar ? snackbar.id + 1 : 0

const updateDialog = (dialogs: Set<string>, dialogKey: string, show: boolean) =>
  show
    ? new Set([...dialogs, dialogKey])
    : new Set([...dialogs].filter(R.complement(R.equals)(dialogKey)))

export const ui = (
  state: UIState = INITIAL_UI_STATE,
  action: Action<any, null>
): UIState => {
  switch (action.type) {
  case SET_SHOW_DRAWER:
    return { ...state, showDrawer: action.payload }
  case SET_SNACKBAR_MESSAGE:
    return {
      ...state,
      snackbar: {
        ...action.payload,
        id: nextSnackbarId(state.snackbar)
      }
    }
  case SHOW_DIALOG:
    return {
      ...state,
      dialogs: updateDialog(state.dialogs, action.payload, true)
    }
  case HIDE_DIALOG:
    return {
      ...state,
      dialogs: updateDialog(state.dialogs, action.payload, false)
    }
  case SET_SHOW_USER_MENU:
    return { ...state, showUserMenu: action.payload }
  }
  return state
}
