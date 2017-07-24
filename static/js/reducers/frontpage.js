// @flow
import { GET, INITIAL_STATE } from 'redux-hammock/constants';

import { makeFrontpagePostList } from '../factories/posts';
import type { Post } from '../flow/discussionTypes';

export const frontPageEndpoint = {
  name: 'frontpage',
  verbs: [ GET ],
  initialState: { ...INITIAL_STATE, data: [] },
  getFunc: async () => {
    let posts = makeFrontpagePostList();
    return posts;
  },
  getSuccessHandler: (payload: Array<Post>) => (
    payload.map(post => post.id)
  )
};
