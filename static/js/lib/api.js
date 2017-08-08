// @flow
/* global SETTINGS:false, fetch: false */
// For mocking purposes we need to use "fetch" defined as a global instead of importing as a local.
import R from "ramda"
import "isomorphic-fetch"
import { fetchJSONWithCSRF } from "redux-hammock/django_csrf_fetch"
import { POST } from "redux-hammock/constants"

import type { Channel, CreatePostPayload, Post } from "../flow/discussionTypes"
import type { CommentResponse } from "../reducers/comments"

export function getFrontpage(): Promise<Post> {
  return fetchJSONWithCSRF(`/api/v0/frontpage/`)
}

export function getChannel(channelName: string): Promise<Channel> {
  return fetchJSONWithCSRF(`/api/v0/channels/${channelName}/`)
}

export function getChannels(): Promise<Array<Channel>> {
  return fetchJSONWithCSRF("/api/v0/channels/")
}

export function createChannel(channel: Channel): Promise<Channel> {
  return fetchJSONWithCSRF(`/api/v0/channels/`, {
    method: POST,
    body:   JSON.stringify(R.pickAll(["name", "title", "public_description", "channel_type"], channel))
  })
}

export function getPostsForChannel(channelName: string): Promise<Array<Post>> {
  return fetchJSONWithCSRF(`/api/v0/channels/${channelName}/posts/`)
}

export function createPost(channelName: string, payload: CreatePostPayload): Promise<Post> {
  const { text, url, title } = payload
  return fetchJSONWithCSRF(`/api/v0/channels/${channelName}/posts/`, {
    method: "POST",
    body:   JSON.stringify({
      url:   url,
      text:  text,
      title: title
    })
  })
}

export function getPost(postId: string): Promise<Post> {
  return fetchJSONWithCSRF(`/api/v0/posts/${postId}/`)
}

export async function getComments(postID: string): Promise<CommentResponse> {
  let response = await fetchJSONWithCSRF(`/api/v0/posts/${postID}/comments/`)
  return { postID, data: response }
}

export function createComment(postId: string, comment: string, commentId: ?string) {
  let body = commentId === undefined ? { text: comment } : { text: comment, comment_id: commentId }

  return fetchJSONWithCSRF(`/api/v0/posts/${postId}/comments/`, {
    method: POST,
    body:   JSON.stringify(body)
  })
}

export function updateUpvote(postId: string, upvoted: boolean): Promise<Post> {
  return fetchJSONWithCSRF(`/api/v0/posts/${postId}/`, {
    method: "PATCH",
    body:   JSON.stringify({ upvoted })
  })
}
