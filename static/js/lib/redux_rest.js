// @flow
import { postsEndpoint } from '../reducers/posts';
import { channelsEndpoint } from '../reducers/channels';
import { postsForChannelEndpoint } from '../reducers/posts_for_channel';
import { frontPageEndpoint } from '../reducers/frontpage';
import { commentsEndpoint } from '../reducers/comments';

export const endpoints = [
  postsEndpoint,
  channelsEndpoint,
  postsForChannelEndpoint,
  frontPageEndpoint,
  commentsEndpoint,
];
