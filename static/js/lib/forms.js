//@flow
import R from "ramda"

import { actions } from "../actions"

import type { ConfiguredFormProps, NewFormFunc } from "../flow/formTypes"

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
