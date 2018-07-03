// @flow


export type FormValue<T> = {
  value:  T,
  errors: Object,
}

export type FormsState<T> = {
  [string]: FormValue<T>,
}

export type FormActionPayload = {
  formKey: string,
  value?:  Object,
  errors?: Object,
}
