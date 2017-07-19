// @flow
import type { Channel } from '../flow/discussionTypes';
import { makeChannel } from '../factories/channels';

export const channelsEndpoint = {
  name: 'channels',
  verbs: [ 'GET' ],
  getFunc: async (name: string) => {
    let channel = makeChannel();
    channel.name = name;
    return channel;
  },
  getSuccessHandler: (payload: Channel, data: Map<string, Channel>) => {
    let update = new Map(data);
    update.set(payload.name, payload);
    return update;
  },
};
