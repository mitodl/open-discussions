// @flow

export type FormValue<T> = {
  value:  T,
  errors: FormErrors<T>,
}

export type FormsState = {
  [string]: FormValue<*>,
}

export type FormErrors<T> = $Shape<{[$Keys<T>]: string }>

export type FormActionPayload<T> = {
  formKey: string,
  value?:  $Shape<T>,
  errors?: FormErrors<T>,
}

export type FormActionCreators = {
  formBeginEdit: () => Action,
  formEndEdit: () => Action,
  formUpdate: (Object) => Action,
  formValidate: (Object) => Action
}

export type NewFormFunc<T> = () => T

export type ConfiguredFormProps<T> = {
  getForm: Object => ?FormValue<T>,
  actionCreators: FormActionCreators
}

export type WithFormProps<T> = {
  form: ?FormValue<T>,
  processing: boolean,
  onUpdate: Object => void,
  onSubmit: T => Promise<*>,
  onSubmitResult: Function,
  getSubmitResultErrors?: ?Object => ?FormErrors<string>,
  onSubmitFailure?: Object => FormErrors<string>,
  useRecaptcha?: boolean,
  validateForm: FormValue<T> => {value: FormErrors<T>},
  renderForm: Function
} & FormActionCreators

export type FormProps<T> = {
  form: T,
  validation: FormErrors<T>,
  processing: boolean,
  onUpdate: Object => void,
  onSubmit: ?Object => void,
  onRecaptcha?: Object => void
}

export type FormOption = {
  label: string,
  value: string
}

export type FormComponentCls<T> = React$ComponentType<$Subtype<FormProps<T>>>
export type WrappedComponentCls<T> = React$ComponentType<WithFormProps<T>>
