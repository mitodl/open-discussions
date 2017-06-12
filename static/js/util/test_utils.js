/* global SETTINGS: false */
// @flow
import React from 'react';
import { Route } from 'react-router';
import { assert } from 'chai';
import _ from 'lodash';
import R from 'ramda';

import type { Action } from '../flow/reduxTypes';
import type { Store } from 'redux';
import App from '../containers/App';

export function createAssertReducerResultState<State>(store: Store, getReducerState: (x: any) => State) {
  return (
    action: () => Action<*,*>, stateLookup: (state: State) => any, defaultValue: any
  ): void => {
    const getState = () => stateLookup(getReducerState(store.getState()));

    assert.deepEqual(defaultValue, getState());
    for (let value of [true, null, false, 0, 3, 'x', {'a': 'b'}, {}, [3, 4, 5], [], '']) {
      store.dispatch(action(value));
      assert.deepEqual(value, getState());
    }
  };
}

export const testRoutes = (
  <Route path="/" component={App}>
  </Route>
);

export const stringStrip = R.compose(R.join(" "), _.words);
