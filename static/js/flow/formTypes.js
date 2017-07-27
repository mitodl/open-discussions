//@flow

import type { Action, ActionCreator } from '../flow/reduxTypes'

export type FormValue = {
  value: ?Object,
  //errors: ValidationErrors
}

export type FormActions = {
  create: ActionCreator,
  update: ActionCreator,
  reset: ActionCreator,
}

export type FormReducer = (FormValue,  Action<any, null>) => FormValue
