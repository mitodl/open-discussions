// @flow

export type FormValue<T> = {
  value:  T,
  errors: FormErrors<T>,
}

export type FormsState = {
  [string]: FormValue<*>,
}

export type FormErrors<T> = {[$Keys<T>]: string }

export type FormActionPayload<T> = {
  formKey: string,
  value?:  $Shape<T>,
  errors?: FormErrors<T>,
}

export type FormActionCreators<T> = {
  formBeginEdit: () => Action,
  formEndEdit: () => Action,
  formUpdate: ($Shape<T>) => Action,
  formValidate: ($Shape<T>) => Action
}

export type NewFormFunc<T> = () => T
export type ConfiguredFormProps<T> = {
  getForm: Object => ?FormValue<T>,
  actionCreators: FormActionCreators<T>
}

export type WithFormProps<T> = {
  form: ?FormValue<T>,
  processing: boolean,
  onUpdate: Object => void,
  onSubmit: T => Promise<*>,
  onSubmitResult: Function,
  onSubmitError?: Function,
  validateForm: FormValue<T> => {value: FormErrors<T>},
  renderForm: Function
} & FormActionCreators<T>

export type FormProps<T> = {
  form: T,
  validation: FormErrors<T>,
  processing: boolean,
  onUpdate: Object => void,
  onSubmit: ?Object => void
}

export type FormComponentCls<T> = React$ComponentType<$Subtype<FormProps<T>>>
export type WrappedComponentCls<T> = React$ComponentType<WithFormProps<T>>
