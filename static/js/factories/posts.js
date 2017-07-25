// @flow
import R from 'ramda';
import casual from 'casual-browserify';

import type { Post } from '../flow/discussionTypes';

export const makePost = (isURLPost: boolean = false): Post => ({
  id: String(Math.random()),
  title: casual.sentence,
  score: Math.round(Math.random() * 15),
  upvoted: Math.random() < 0.5,
  author_id: `justareddituser${String(Math.random())}`,
  text: isURLPost ? null : casual.text,
  url: isURLPost ? casual.url : null,
  created: casual.moment.format(),
  num_comments: Math.round(Math.random() * 10),
  channel_name: casual.word,
});

export const makeChannelPostList = () => (
  R.range(0, 20).map(() => makePost(Math.random() > .5))
);
