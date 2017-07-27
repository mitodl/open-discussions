// @flow
/* global SETTINGS:false, fetch: false */
// For mocking purposes we need to use "fetch" defined as a global instead of importing as a local.
import R from "ramda"
import "isomorphic-fetch"
import { POST } from "redux-hammock/constants"
import { fetchJSONWithCSRF } from "redux-hammock/django_csrf_fetch"

import type { Channel, Post } from "../flow/discussionTypes"

export function getFrontpage(): Promise<Post> {
  return fetchJSONWithCSRF(`/api/v0/frontpage/`)
}

export function getChannel(channelName: string): Promise<Channel> {
  return fetchJSONWithCSRF(`/api/v0/channels/${channelName}/`)
}

export function createChannel(channel: Channel): Promise<Channel> {
  return fetchJSONWithCSRF(`/api/v0/channels/`, {
    method: POST,
    body:   JSON.stringify(R.pickAll(["name", "title", "public_description", "channel_type"], channel))
  })
}

export function getPostsForChannel(channelName: string): Promise<Post> {
  return fetchJSONWithCSRF(`/api/v0/channels/${channelName}/posts/`)
}

export function getPost(postId: string): Promise<Post> {
  return fetchJSONWithCSRF(`/api/v0/posts/${postId}/`)
}
