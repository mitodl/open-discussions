//@flow
import R from "ramda"

import { FORM_BEGIN_EDIT, FORM_UPDATE, FORM_END_EDIT } from "../actions/forms"

import type { Action } from "../flow/reduxTypes"
import type { FormsState, FormActionPayload } from "../flow/formTypes"

export const forms = (
  state: Object = {},
  action: Action<FormActionPayload, null>
): FormsState => {
  switch (action.type) {
  case FORM_BEGIN_EDIT:
    return {
      ...state,
      [action.payload.formKey]: {
        value:  action.payload.value,
        errors: {}
      }
    }
  case FORM_UPDATE:
    return R.mergeDeepRight(state, {
      [action.payload.formKey]: {
        value: action.payload.value
      }
    })
  case FORM_END_EDIT:
    return R.omit(action.payload.formKey, state)
  }
  return state
}
