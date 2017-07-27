//@flow
import { createAction } from "redux-actions"
import R from "ramda"

import type { Action } from "../flow/reduxTypes"
import type { FormActions, FormReducer, FormValue } from "../flow/formTypes"

const createActionType = (name: string) => `FORM_${name}_CREATE`.toUpperCase()
const updateActionType = (name: string) => `FORM_${name}_UPDATE`.toUpperCase()
const resetActionType = (name: string) => `FORM_${name}_RESET`.toUpperCase()

export const deriveActionTypes = (name: string) => ({
  create: createActionType(name),
  update: updateActionType(name),
  reset:  resetActionType(name)
})

export const deriveActions = (name: string): FormActions => R.map(createAction, deriveActionTypes(name))

const INITIAL_STATE = {
  value:  null,
  errors: {}
}

export const deriveReducer = (name: string, newDefaults: () => Object): FormReducer => {
  const actionTypes = deriveActionTypes(name)
  return (state: FormValue = INITIAL_STATE, action: Action<any, null>): FormValue => {
    switch (action.type) {
    case actionTypes.reset:
    case actionTypes.create:
      return {
        errors: {},
        value:  newDefaults()
      }
    case actionTypes.update:
      return {
        ...state,
        value: {
          ...state.value,
          ...action.payload
        }
      }
    }
    return state
  }
}
