// @flow
import R from "ramda"
import { PATCH, POST, DELETE } from "redux-hammock/constants"

import { fetchJSONWithAuthFailure, fetchWithAuthFailure } from "./fetch_auth"
import { getPaginationSortQS } from "./util"

import type {
  Channel,
  ChannelContributors,
  ChannelInvitation,
  Contributor,
  Subscriber,
  PostListPaginationParams,
  PostListResponse
} from "../../flow/discussionTypes"

export function getChannel(channelName: string): Promise<Channel> {
  return fetchJSONWithAuthFailure(`/api/v0/channels/${channelName}/`)
}

export function getChannels(): Promise<Array<Channel>> {
  return fetchJSONWithAuthFailure("/api/v0/channels/")
}

export function createChannel(channel: Channel): Promise<Channel> {
  return fetchJSONWithAuthFailure(`/api/v0/channels/`, {
    method: POST,
    body:   JSON.stringify(
      R.pickAll(
        [
          "name",
          "title",
          "public_description",
          "channel_type",
          "membership_is_managed"
        ],
        channel
      )
    )
  })
}

export function updateChannel(channel: Channel): Promise<Channel> {
  return fetchJSONWithAuthFailure(`/api/v0/channels/${channel.name}/`, {
    method: PATCH,
    body:   JSON.stringify(
      R.pickAll(
        [
          "title",
          "public_description",
          "channel_type",
          "allowed_post_types",
          "about"
        ],
        channel
      )
    )
  })
}

export function getPostsForChannel(
  channelName: string,
  params: PostListPaginationParams
): Promise<PostListResponse> {
  return fetchJSONWithAuthFailure(
    `/api/v0/channels/${channelName}/posts/${getPaginationSortQS(params)}`
  )
}

export function getChannelContributors(
  channelName: string
): Promise<ChannelContributors> {
  return fetchJSONWithAuthFailure(
    `/api/v0/channels/${channelName}/contributors/`
  )
}

export function addChannelContributor(
  channelName: string,
  email: string
): Promise<Contributor> {
  return fetchJSONWithAuthFailure(
    `/api/v0/channels/${channelName}/contributors/`,
    {
      method: POST,
      body:   JSON.stringify({ email })
    }
  )
}

export function deleteChannelContributor(
  channelName: string,
  username: string
): Promise<void> {
  return fetchWithAuthFailure(
    `/api/v0/channels/${channelName}/contributors/${username}/`,
    { method: DELETE }
  )
}

export function addChannelSubscriber(
  channelName: string,
  username: string
): Promise<Subscriber> {
  return fetchJSONWithAuthFailure(
    `/api/v0/channels/${channelName}/subscribers/`,
    {
      method: POST,
      body:   JSON.stringify({
        subscriber_name: username
      })
    }
  )
}

export function deleteChannelSubscriber(
  channelName: string,
  username: string
): Promise<void> {
  return fetchWithAuthFailure(
    `/api/v0/channels/${channelName}/subscribers/${username}/`,
    { method: DELETE }
  )
}

export function addChannelInvitation(
  channelName: string,
  email: string
): Promise<ChannelInvitation> {
  return fetchJSONWithAuthFailure(`/api/v0/channels/${channelName}/invites/`, {
    method: POST,
    body:   JSON.stringify({ email })
  })
}
