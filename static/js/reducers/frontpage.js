// @flow
import { GET, INITIAL_STATE } from 'redux-hammock/constants';

import * as api from '../lib/api';
import type { Post } from '../flow/discussionTypes';

export const frontPageEndpoint = {
  name: 'frontpage',
  verbs: [ GET ],
  initialState: { ...INITIAL_STATE, data: [] },
  getFunc: () => api.getFrontpage(),
  getSuccessHandler: (payload: Array<Post>) => (
    payload.map(post => post.id)
  )
};
