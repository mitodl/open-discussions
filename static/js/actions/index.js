// @flow
import { deriveActions } from 'redux-hammock';

import { endpoints } from '../lib/redux_rest';

export const UPDATE_CHECKBOX = 'UPDATE_CHECKBOX';

export const updateCheckbox = (checked: boolean) => ({
  type: UPDATE_CHECKBOX,
  payload: { checked }
});

const actions: Object = {};
endpoints.forEach(endpoint => {
  actions[endpoint.name] = deriveActions(endpoint);
});

export { actions };
