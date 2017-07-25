// @flow
import { GET, INITIAL_STATE } from 'redux-hammock/constants';

import { makeCommentTree } from '../factories/comments';

import type { Comment, Post } from '../flow/discussionTypes.js';

export const commentsEndpoint = {
  name: 'comments',
  verbs: [ GET ],
  getFunc: async (post: Post) => makeCommentTree(post),
  initialState: { ...INITIAL_STATE, data: new Map },
  getSuccessHandler: (comments: Array<Comment>, data: Map<string, Array<Comment>>) => {
    let update = new Map(data);
    update.set(comments[0].post_id, comments);
    return update;
  },
};
