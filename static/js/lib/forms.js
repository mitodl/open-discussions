//@flow
import R from "ramda"

import { actions } from "../actions"

import type { FormValue } from "../flow/formTypes"

export type FormData = { [string]: any }
export type NewFormFunc = () => FormData
export type ConfiguredFormProps = {
  getForm: Object => ?FormValue<*>,
  actionCreators: {
    formBeginEdit: () => Action,
    formEndEdit: () => Action,
    formUpdate: FormData => Action,
    formValidate: FormData => Action
  }
}

export const formBeginEditForKey = (
  formKey: string,
  getNewFormValues: NewFormFunc
) => () =>
  actions.forms.formBeginEdit({
    formKey,
    value: getNewFormValues()
  })

export const formEndEditForKey = (formKey: string) => () =>
  actions.forms.formEndEdit({ formKey })

export const formUpdateForKey = R.curry((formKey: string, updates: FormData) =>
  actions.forms.formUpdate({
    formKey,
    value: {
      ...updates
    }
  })
)

export const formValidateForKey = R.curry((formKey: string, errors: FormData) =>
  actions.forms.formValidate({
    formKey,
    errors: {
      ...errors
    }
  })
)

export const configureForm = (
  formKey: string,
  getNewFormValues: NewFormFunc
): ConfiguredFormProps => ({
  getForm:        R.path(["forms", formKey]),
  actionCreators: {
    formBeginEdit: formBeginEditForKey(formKey, getNewFormValues),
    formEndEdit:   formEndEditForKey(formKey),
    formUpdate:    formUpdateForKey(formKey),
    formValidate:  formValidateForKey(formKey)
  }
})
