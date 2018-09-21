//@flow
import R from "ramda"

import { actions } from "../actions"

import type {
  ConfiguredFormProps,
  FormErrors,
  NewFormFunc
} from "../flow/formTypes"
import type { AuthResponse } from "../flow/authTypes"

export const formBeginEditForKey = <T>(
  formKey: string,
  getNewFormValues: NewFormFunc<T>
) => () =>
    actions.forms.formBeginEdit({
      formKey,
      value: getNewFormValues()
    })

export const formEndEditForKey = (formKey: string) => () =>
  actions.forms.formEndEdit({ formKey })

export const formUpdateForKey = <T>(formKey: string) => (updates: $Shape<T>) =>
  actions.forms.formUpdate({
    formKey,
    value: {
      ...updates
    }
  })

export const formValidateForKey = <T>(formKey: string) => (errors: $Shape<T>) =>
  actions.forms.formValidate({
    formKey,
    errors: {
      ...errors
    }
  })

export const configureForm = <T>(
  formKey: string,
  getNewFormValues: NewFormFunc<T>
): ConfiguredFormProps<T> => ({
    getForm:        R.path(["forms", formKey]),
    actionCreators: {
      formBeginEdit: formBeginEditForKey(formKey, getNewFormValues),
      formEndEdit:   formEndEditForKey(formKey),
      formUpdate:    formUpdateForKey(formKey),
      formValidate:  formValidateForKey(formKey)
    }
  })

/**
 * Helper function that inspects an auth endpoint response for errors. If errors are found,
 * it returns an object that can be passed to formValidate so the response error can be shown
 * as a form validation error.
 */
export const getAuthResponseFieldErrors = R.curry(
  (
    formFieldToAttachErrors: string,
    response: ?AuthResponse
  ): ?FormErrors<*> => {
    const errors = R.propOr([], "errors", response)
    if (errors.length > 0) {
      return { [formFieldToAttachErrors]: errors[0] }
    }
  }
)
