//@flow


export type FormValue = {
  value: Object,
  errors: Object,
}

export type FormsState = {
  [string]: FormValue,
}

export type FormActionPayload = {
  key: string,
  value?: Object
}
