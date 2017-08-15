// @flow
import { SET_SHOW_DRAWER } from "../actions/ui"

import type { Action } from "../flow/reduxTypes"

export type UIState = {
  showDrawer: boolean
}

export const INITIAL_UI_STATE: UIState = {
  showDrawer: false
}

export const ui = (state: Object = INITIAL_UI_STATE, action: Action<boolean, null>): UIState => {
  switch (action.type) {
  case SET_SHOW_DRAWER:
    return { ...state, showDrawer: action.payload }
  }
  return state
}
