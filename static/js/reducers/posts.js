// @flow
import type { Post } from '../flow/discussionTypes';
import { makePost } from '../factories/posts';

import { SET_POST_DATA } from '../actions/post';

const mergePostData = (post: Post, data: Map<string, Post>): Map<string, Post> => {
  let update = new Map(data);
  update.set(post.id, post);
  return update;
};

export const postsEndpoint = {
  name: 'posts',
  verbs: [ 'GET' ],
  getFunc: async (id: string) => {
    let post = makePost();
    post.id = id;
    return post;
  },
  getSuccessHandler: mergePostData,
  extraActions: {
    [SET_POST_DATA]: (state, action) => {
      let update = mergePostData(action.payload, state.data);
      return Object.assign({}, state, { data: update });
    }
  },
};
