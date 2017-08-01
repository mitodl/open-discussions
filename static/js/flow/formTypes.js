//@flow

import type { Action, ActionCreator } from '../flow/reduxTypes'

export type FormValue<T> = {
  value: ?T,
  //errors: ValidationErrors
}

export type FormActions = {
  create: ActionCreator,
  update: ActionCreator,
  reset: ActionCreator,
}

export type FormReducer<T> = (FormValue<T>,  Action<any, null>) => FormValue<T>
