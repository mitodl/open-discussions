// @flow
import R from 'ramda';
import casual from 'casual-browserify';

import type { Post } from '../flow/discussionTypes';

export const makePost = (isURLPost: boolean = false): Post => ({
  id: String(Math.random()),
  title: casual.sentence,
  upvotes: Math.round(Math.random() * 15),
  downvotes: 0,
  upvoted: Math.random() < 0.5,
  downvoted: Math.random() < 0.5,
  author: `justareddituser${String(Math.random())}`,
  text: isURLPost ? null : casual.text,
  url: isURLPost ? casual.url : null,
});

export const makeChannelPostList = () => (
  R.range(0, 20).map(() => makePost(Math.random() > .5))
);
