// @flow
/* global SETTINGS:false, fetch: false */
// For mocking purposes we need to use "fetch" defined as a global instead of importing as a local.
import R from "ramda"
import "isomorphic-fetch"
import qs from "query-string"
import { PATCH, POST, DELETE } from "redux-hammock/constants"

import { fetchJSONWithAuthFailure, fetchWithAuthFailure } from "./auth"
import { toQueryString } from "../lib/url"
import { getPaginationParams } from "../lib/posts"

import type {
  Channel,
  ChannelModerators,
  GenericComment,
  CreatePostPayload,
  PostListPaginationParams,
  Post,
  CommentFromAPI,
  MoreCommentsFromAPI,
  GenericReport
} from "../flow/discussionTypes"

const getPaginationQS = R.compose(
  toQueryString,
  R.reject(R.isNil),
  getPaginationParams
)

export function getFrontpage(params: PostListPaginationParams): Promise<Post> {
  return fetchJSONWithAuthFailure(
    `/api/v0/frontpage/${getPaginationQS(params)}`
  )
}

export function getChannel(channelName: string): Promise<Channel> {
  return fetchJSONWithAuthFailure(`/api/v0/channels/${channelName}/`)
}

export function getChannels(): Promise<Array<Channel>> {
  return fetchJSONWithAuthFailure("/api/v0/channels/")
}

export function getChannelModerators(
  channelName: string
): Promise<ChannelModerators> {
  return fetchJSONWithAuthFailure(`/api/v0/channels/${channelName}/moderators/`)
}

export function createChannel(channel: Channel): Promise<Channel> {
  return fetchJSONWithAuthFailure(`/api/v0/channels/`, {
    method: POST,
    body:   JSON.stringify(
      R.pickAll(
        ["name", "title", "description", "public_description", "channel_type"],
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
        ["title", "description", "public_description", "channel_type"],
        channel
      )
    )
  })
}

export function getPostsForChannel(
  channelName: string,
  params: PostListPaginationParams
): Promise<Array<Post>> {
  return fetchJSONWithAuthFailure(
    `/api/v0/channels/${channelName}/posts/${getPaginationQS(params)}`
  )
}

export function createPost(
  channelName: string,
  payload: CreatePostPayload
): Promise<Post> {
  const { text, url, title } = payload
  return fetchJSONWithAuthFailure(`/api/v0/channels/${channelName}/posts/`, {
    method: "POST",
    body:   JSON.stringify({
      url:   url,
      text:  text,
      title: title
    })
  })
}

export function getPost(postId: string): Promise<Post> {
  return fetchJSONWithAuthFailure(`/api/v0/posts/${postId}/`)
}

export function getComments(
  postID: string
): Promise<Array<CommentFromAPI | MoreCommentsFromAPI>> {
  return fetchJSONWithAuthFailure(`/api/v0/posts/${postID}/comments/`)
}

export const createComment = (
  postId: string,
  text: string,
  commentId: ?string
): Promise<CommentFromAPI> => {
  const body =
    commentId === undefined ? { text } : { text, comment_id: commentId }

  return fetchJSONWithAuthFailure(`/api/v0/posts/${postId}/comments/`, {
    method: POST,
    body:   JSON.stringify(body)
  })
}

export function updateUpvote(postId: string, upvoted: boolean): Promise<Post> {
  return fetchJSONWithAuthFailure(`/api/v0/posts/${postId}/`, {
    method: PATCH,
    body:   JSON.stringify({ upvoted })
  })
}

export function updateRemoved(postId: string, removed: boolean): Promise<Post> {
  return fetchJSONWithAuthFailure(`/api/v0/posts/${postId}/`, {
    method: PATCH,
    body:   JSON.stringify({ removed })
  })
}

export function editPost(postId: string, post: Post): Promise<Post> {
  return fetchJSONWithAuthFailure(`/api/v0/posts/${postId}/`, {
    method: PATCH,
    body:   JSON.stringify(R.dissoc("url", post))
  })
}

export function deletePost(postId: string): Promise<Post> {
  return fetchWithAuthFailure(`/api/v0/posts/${postId}/`, {
    method: DELETE
  })
}

export function updateComment(
  commentId: string,
  commentPayload: Object
): Promise<GenericComment> {
  return fetchJSONWithAuthFailure(`/api/v0/comments/${commentId}/`, {
    method: PATCH,
    body:   JSON.stringify(commentPayload)
  })
}

export function deleteComment(commentId: string): Promise<GenericComment> {
  return fetchWithAuthFailure(`/api/v0/comments/${commentId}/`, {
    method: DELETE
  })
}

export function getMoreComments(
  postId: string,
  parentId: string | null,
  children: Array<string>
): Promise<Array<CommentFromAPI | MoreCommentsFromAPI>> {
  const payload = {
    post_id:  postId,
    children: children
  }
  if (!R.isNil(parentId)) {
    // $FlowFixMe: Flow doesn't know that we're still constructing payload
    payload.parent_id = parentId
  }
  return fetchJSONWithAuthFailure(
    `/api/v0/morecomments/?${qs.stringify(payload)}`
  )
}

export function reportContent(payload: GenericReport): Promise<GenericReport> {
  return fetchJSONWithAuthFailure(`/api/v0/reports/`, {
    method: POST,
    body:   JSON.stringify(payload)
  })
}
