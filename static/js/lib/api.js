// @flow
/* global SETTINGS:false, fetch: false */
// For mocking purposes we need to use 'fetch' defined as a global instead of importing as a local.
import 'isomorphic-fetch';
import { fetchJSONWithCSRF } from 'redux-hammock/django_csrf_fetch';

import type {
  Channel,
  Post,
} from '../flow/discussionTypes';

export function patchThing(username: string, newThing: Object) {
  return fetchJSONWithCSRF(`/api/v0/thing/${username}/`, {
    method: 'PATCH',
    body: JSON.stringify(newThing)
  });
}

export function getChannel(channelName: string): Promise<Channel> {
  return fetchJSONWithCSRF(`/api/v0/channels/${channelName}/`);
}

export function getPosts(channelName: string): Promise<Post> {
  return fetchJSONWithCSRF(`/api/v0/posts/${channelName}/`);
}
