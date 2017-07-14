// @flow
import type { Action } from '../flow/reduxTypes';
import type { ChannelState } from '../flow/discussionTypes';

const INITIAL_STATE: ChannelState = {
  channel: null,
};

export const channels = (state: ChannelState = INITIAL_STATE, action: Action<any, any>): ChannelState => {
  switch (action.type) {
  default:
    return state;
  }
};
