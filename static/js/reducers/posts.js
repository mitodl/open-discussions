// @flow
import { GET, INITIAL_STATE } from 'redux-hammock/constants';

import { SET_POST_DATA } from '../actions/post';
import { makePost } from '../factories/posts';

import type { Post } from '../flow/discussionTypes';

const mergePostData = (post: Post, data: Map<string, Post>): Map<string, Post> => {
  let update = new Map(data);
  update.set(post.id, post);
  return update;
};

const mergeMultiplePosts = (posts: Array<Post>, data: Map<string, Post>): Map<string, Post> => {
  let update = new Map(data);
  posts.forEach(post => {
    update.set(post.id, post);
  });
  return update;
};

export const postsEndpoint = {
  name: 'posts',
  verbs: [ GET ],
  getFunc: async (id: string) => {
    let post = makePost();
    post.id = id;
    return post;
  },
  initialState: { ...INITIAL_STATE, data: new Map },
  getSuccessHandler: mergePostData,
  extraActions: {
    [SET_POST_DATA]: (state, action) => {
      let update = action.payload instanceof Array
        ? mergeMultiplePosts(action.payload, state.data)
        : mergePostData(action.payload, state.data);
      return Object.assign({}, state, { data: update });
    }
  },
};
