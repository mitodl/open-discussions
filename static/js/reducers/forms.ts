
import R from "ramda";

import { FORM_BEGIN_EDIT, FORM_UPDATE, FORM_VALIDATE, FORM_END_EDIT } from "../actions/forms";

import { Action } from "../flow/reduxTypes";
import { FormsState, FormActionPayload } from "../flow/formTypes";

export const forms = (state: Object = {}, action: Action<FormActionPayload<any>, null>): FormsState => {
  switch (action.type) {
    case FORM_BEGIN_EDIT:
      return {
        ...state,
        [action.payload.formKey]: {
          value: action.payload.value,
          errors: {}
        }
      };
    case FORM_UPDATE:
      return R.mergeDeepRight(state, {
        [action.payload.formKey]: {
          value: action.payload.value
        }
      });
    case FORM_VALIDATE:
      return R.mergeDeepRight(R.dissocPath([action.payload.formKey, "errors"], state), {
        [action.payload.formKey]: {
          errors: action.payload.errors
        }
      });
    case FORM_END_EDIT:
      return R.omit([action.payload.formKey], state);

  }
  return state;
};