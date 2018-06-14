// @flow
import {Dispatch} from "redux"

export type ActionType = string

export type Action<payload, meta> = {
  type: ActionType,
  payload: payload,
  meta: meta,
}

export type Dispatcher<T> = (d: Dispatch) => Promise<T>
