// @flow
import { GET, INITIAL_STATE } from 'redux-hammock/constants';

import { makeChannel } from '../factories/channels';
import { makeChannelPostList } from '../factories/posts';
import type { Channel, Post } from '../flow/discussionTypes';

type ChannelEndpointResponse = {
  channel: Channel,
  posts: Array<Post>
};

export const postsForChannelEndpoint = {
  name: 'postsForChannel',
  verbs: [ GET ],
  getFunc: async (channelID: string) => {
    let channel = makeChannel();
    channel.name = channelID;
    return {
      channel: channel,
      posts: makeChannelPostList()
    };
  },
  initialState: { ...INITIAL_STATE, data: new Map },
  getSuccessHandler: (payload: ChannelEndpointResponse, data: Map<string, Array<string>>) => {
    const { channel, posts } = payload;
    let update = new Map(data);
    update.set(channel.name, posts.map(post => post.id));
    return update;
  }
};
