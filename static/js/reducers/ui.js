// @flow
import { SET_SHOW_DRAWER, SET_SNACKBAR_MESSAGE } from "../actions/ui"

import type { Action } from "../flow/reduxTypes"

export type SnackbarState = {
  id: number,
  message: string,
  actionText: ?string,
  timeout: ?number
}

export type UIState = {
  showDrawer: boolean,
  snackbar: ?SnackbarState
}

export const INITIAL_UI_STATE: UIState = {
  showDrawer: false,
  snackbar:   null
}

// this generates a new sequential id for each snackbar state that is pushed
// this ensures the snack will display for each message even if they repeat
const nextSnackbarId = (snackbar: ?SnackbarState): number =>
  snackbar ? snackbar.id + 1 : 0

export const ui = (
  state: Object = INITIAL_UI_STATE,
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
  }
  return state
}
