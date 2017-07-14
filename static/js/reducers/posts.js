// @flow=
import type { Action } from '../flow/reduxTypes';
import type { PostsState } from '../flow/discussionTypes';

const INITIAL_STATE: PostsState = {
  post: null,
  posts: null,
};

export const posts = (state: PostsState = INITIAL_STATE, action: Action<any, any>): PostsState => {
  switch (action.type) {
  default:
    return state;
  }
};
