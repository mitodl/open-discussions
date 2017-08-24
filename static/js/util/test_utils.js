/* global SETTINGS: false */
// @flow
import { assert } from "chai"
import _ from "lodash"
import R from "ramda"

import type { Action } from "../flow/reduxTypes"
import type { Store } from "redux"

export function createAssertReducerResultState<State>(
  store: Store,
  getReducerState: (x: any) => State
) {
  return (
    action: (payload: any) => Action<*, *>,
    stateLookup: (state: State) => any,
    defaultValue: any
  ): void => {
    const getState = () => stateLookup(getReducerState(store.getState()))

    assert.deepEqual(defaultValue, getState())
    for (let value of [
      true,
      null,
      false,
      0,
      3,
      "x",
      { a: "b" },
      {},
      [3, 4, 5],
      [],
      ""
    ]) {
      store.dispatch(action(value))
      assert.deepEqual(value, getState())
    }
  }
}

export const stringStrip = R.compose(R.join(" "), _.words)
