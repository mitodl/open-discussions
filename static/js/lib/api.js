// @flow
/* global SETTINGS:false, fetch: false */
// For mocking purposes we need to use "fetch" defined as a global instead of importing as a local.
import R from "ramda"
import "isomorphic-fetch"
import qs from "query-string"
import { PATCH, POST, DELETE } from "redux-hammock/constants"
import { fetchJSONWithCSRF } from "redux-hammock/django_csrf_fetch"

import {
  fetchJSONWithAuthFailure,
  fetchWithAuthFailure,
  fetchJSONWithToken
} from "./fetch_auth"
import { toQueryString } from "../lib/url"
import { getPaginationSortParams } from "../lib/posts"

import type { RegisterResponse, LoginResponse } from "../flow/authTypes"
import type {
  Channel,
  ChannelModerators,
  GenericComment,
  CreatePostPayload,
  PostListPaginationParams,
  Post,
  CommentFromAPI,
  MoreCommentsFromAPI,
  GenericReport,
  ReportRecord
} from "../flow/discussionTypes"
import type { NotificationSetting } from "../flow/settingsTypes"
import type { EmbedlyResponse } from "../reducers/embedly"

const paramsToQueryString = paramSelector =>
  R.compose(
    toQueryString,
    R.reject(R.isNil),
    paramSelector
  )

const getPaginationSortQS = paramsToQueryString(getPaginationSortParams)

const getCommentSortQS = paramsToQueryString(R.pickAll(["sort"]))

export function getFrontpage(params: PostListPaginationParams): Promise<Post> {
  return fetchJSONWithAuthFailure(
    `/api/v0/frontpage/${getPaginationSortQS(params)}`
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
    `/api/v0/channels/${channelName}/posts/${getPaginationSortQS(params)}`
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
  postID: string,
  params: Object
): Promise<Array<CommentFromAPI | MoreCommentsFromAPI>> {
  return fetchJSONWithAuthFailure(
    `/api/v0/posts/${postID}/comments/${getCommentSortQS(params)}`
  )
}

export const getComment = (
  commentID: string
): Promise<Array<CommentFromAPI | MoreCommentsFromAPI>> =>
  fetchJSONWithAuthFailure(`/api/v0/comments/${commentID}`)

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

export const getReports = (channelName: string): Promise<Array<ReportRecord>> =>
  fetchJSONWithAuthFailure(`/api/v0/channels/${channelName}/reports/`)

export const getSettings = (token: ?string = undefined) =>
  token
    ? fetchJSONWithToken("/api/v0/notification_settings/", token)
    : fetchJSONWithAuthFailure("/api/v0/notification_settings/")

export const patchFrontpageSetting = (
  setting: NotificationSetting,
  token: ?string = undefined
) =>
  token
    ? fetchJSONWithToken("/api/v0/notification_settings/frontpage/", token, {
      method: PATCH,
      body:   JSON.stringify(setting)
    })
    : fetchJSONWithAuthFailure("/api/v0/notification_settings/frontpage/", {
      method: PATCH,
      body:   JSON.stringify(setting)
    })

export const patchCommentSetting = (
  setting: NotificationSetting,
  token: ?string = undefined
) =>
  token
    ? fetchJSONWithToken("/api/v0/notification_settings/comments/", token, {
      method: PATCH,
      body:   JSON.stringify(setting)
    })
    : fetchJSONWithAuthFailure("/api/v0/notification_settings/comments/", {
      method: PATCH,
      body:   JSON.stringify(setting)
    })

export const getEmbedly = async (url: string): Promise<EmbedlyResponse> => {
  const response = await fetchJSONWithAuthFailure(
    `/api/v0/embedly/${encodeURIComponent(encodeURIComponent(url))}/`
  )

  return { url, response }
}

export const postEmailLogin = (email: string): Promise<LoginResponse> =>
  fetchJSONWithCSRF("/api/v0/login/email/", {
    method: POST,
    body:   JSON.stringify({ email })
  })

export const postPasswordLogin = (
  partialToken: string,
  password: string
): Promise<LoginResponse> =>
  fetchJSONWithCSRF("/api/v0/login/password/", {
    method: POST,
    body:   JSON.stringify({
      partial_token: partialToken,
      password:      password
    })
  })

export const postEmailRegister = (email: string): Promise<RegisterResponse> =>
  fetchJSONWithCSRF("/api/v0/register/email/", {
    method: POST,
    body:   JSON.stringify({ email })
  })

export const postConfirmRegister = (code: string): Promise<RegisterResponse> =>
  fetchJSONWithCSRF("/api/v0/register/confirm/", {
    method: POST,
    body:   JSON.stringify({ code })
  })

export const postDetailsRegister = (
  partialToken: string,
  name: string,
  password: string,
  tos: boolean
): Promise<RegisterResponse> =>
  fetchJSONWithCSRF("/api/v0/register/details/", {
    method: POST,
    body:   JSON.stringify({ partial_token: partialToken, name, password, tos })
  })
