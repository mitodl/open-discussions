// @flow
import { makeChannelPostList } from '../factories/posts';
import type { Post } from '../flow/discussionTypes';

export const frontPageEndpoint = {
  name: 'frontpage',
  verbs: [ 'GET' ],
  getFunc: async () => {
    let posts = makeChannelPostList();
    return posts;
  },
  getSuccessHandler: (payload: Array<Post>, data: Set<string>) => {
    let update = new Set(data);
    payload.forEach(post => update.add(post.id));
    return update;
  }
};
