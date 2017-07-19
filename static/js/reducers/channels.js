// @flow
import { GET, INITIAL_STATE } from 'redux-hammock/constants';

import type { Channel } from '../flow/discussionTypes';
import { makeChannel } from '../factories/channels';

export const channelsEndpoint = {
  name: 'channels',
  verbs: [ GET ],
  initialState: { ...INITIAL_STATE, data: new Map },
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
