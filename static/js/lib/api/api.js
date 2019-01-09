// @flow
/* global SETTINGS:false, fetch: false */
// For mocking purposes we need to use "fetch" defined as a global instead of importing as a local.
import R from "ramda"
import qs from "query-string"
import { PATCH, POST, DELETE } from "redux-hammock/constants"
import { fetchJSONWithCSRF } from "redux-hammock/django_csrf_fetch"

import { buildSearchQuery } from "../search"
import {
  fetchJSONWithAuthFailure,
  fetchWithAuthFailure,
  fetchJSONWithToken
} from "./fetch_auth"
import { getCommentSortQS } from "./util"

import type { AuthResponse, AuthFlow } from "../../flow/authTypes"
import type {
  GenericComment,
  CommentFromAPI,
  MoreCommentsFromAPI,
  Profile,
  ProfilePayload,
  SocialAuth
} from "../../flow/discussionTypes"
import type { NotificationSetting } from "../../flow/settingsTypes"
import type { WidgetListResponse } from "../../flow/widgetTypes"
import type { SearchParams } from "../../flow/searchTypes"

export function search(params: SearchParams): Promise<*> {
  const body = buildSearchQuery(params)

  return fetchJSONWithAuthFailure("/api/v0/search/", {
    method: POST,
    body:   JSON.stringify(body)
  })
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

export function patchProfileImage(
  username: string,
  image: Blob,
  name: string
): Promise<string> {
  const formData = new FormData()
  formData.append("image_file", image, name)
  return fetchWithAuthFailure(`/api/v0/profiles/${username}/`, {
    headers: {
      Accept: "text/html"
    },
    method: "PATCH",
    body:   formData
  })
}

export function getProfile(username: string): Promise<Profile> {
  return fetchJSONWithAuthFailure(`/api/v0/profiles/${username}/`)
}

export function updateProfile(
  username: string,
  payload: ProfilePayload
): Promise<Profile> {
  return fetchJSONWithAuthFailure(`/api/v0/profiles/${username}/`, {
    method: PATCH,
    body:   JSON.stringify(payload)
  })
}

export const postUserWebsite = (
  username: string,
  url: string,
  submittedSiteType?: string
): Promise<AuthResponse> =>
  fetchJSONWithAuthFailure("/api/v0/websites/", {
    method: POST,
    body:   JSON.stringify({
      username:            username,
      url:                 url,
      submitted_site_type: submittedSiteType
    })
  })

export const deleteUserWebsite = (
  userWebsiteId: number
): Promise<AuthResponse> =>
  fetchWithAuthFailure(`/api/v0/websites/${userWebsiteId}/`, {
    method: DELETE
  })

export function patchChannelAvatar(
  channelName: string,
  image: Blob,
  name: string
): Promise<string> {
  const formData = new FormData()
  formData.append("avatar", image, name)
  return fetchWithAuthFailure(`/api/v0/channels/${channelName}/`, {
    headers: {
      Accept: "text/html"
    },
    method: "PATCH",
    body:   formData
  })
}

export function patchChannelBanner(
  channelName: string,
  image: Blob,
  name: string
): Promise<string> {
  const formData = new FormData()
  formData.append("banner", image, name)
  return fetchWithAuthFailure(`/api/v0/channels/${channelName}/`, {
    headers: {
      Accept: "text/html"
    },
    method: "PATCH",
    body:   formData
  })
}

export const postEmailLogin = (
  flow: AuthFlow,
  email: string,
  next: string
): Promise<AuthResponse> =>
  fetchJSONWithCSRF("/api/v0/login/email/", {
    method: POST,
    body:   JSON.stringify({ flow, email, next })
  })

export const postPasswordLogin = (
  flow: AuthFlow,
  partialToken: string,
  password: string
): Promise<AuthResponse> =>
  fetchJSONWithCSRF("/api/v0/login/password/", {
    method: POST,
    body:   JSON.stringify({
      flow,
      partial_token: partialToken,
      password
    })
  })

// here, if a partial token is provided it takes precedence
export const postEmailRegister = (
  flow: AuthFlow,
  email: string,
  next: string,
  recaptcha: ?string,
  partialToken: ?string
): Promise<AuthResponse> =>
  fetchJSONWithCSRF("/api/v0/register/email/", {
    method: POST,
    body:   JSON.stringify(
      partialToken
        ? { flow, partial_token: partialToken, recaptcha, next }
        : { flow, email, recaptcha, next }
    )
  })

export const postConfirmRegister = (
  flow: AuthFlow,
  partialToken: string,
  code: string
): Promise<AuthResponse> =>
  fetchJSONWithCSRF("/api/v0/register/confirm/", {
    method: POST,
    body:   JSON.stringify({
      flow,
      partial_token:     partialToken,
      verification_code: code
    })
  })

export const postDetailsRegister = (
  flow: AuthFlow,
  partialToken: string,
  name: string,
  password: string
): Promise<AuthResponse> =>
  fetchJSONWithCSRF("/api/v0/register/details/", {
    method: POST,
    body:   JSON.stringify({ flow, partial_token: partialToken, name, password })
  })

export const postPasswordResetEmail = (email: string): Promise<*> =>
  fetchJSONWithCSRF("/api/v0/password_reset/", {
    method: POST,
    body:   JSON.stringify({ email })
  })

export const postPasswordResetNewPassword = (
  newPassword: string,
  reNewPassword: string,
  token: string,
  uid: string
): Promise<*> =>
  fetchJSONWithCSRF("/api/v0/password_reset/confirm/", {
    method: POST,
    body:   JSON.stringify({
      new_password:    newPassword,
      re_new_password: reNewPassword,
      token,
      uid
    })
  })

export const postSetPassword = (
  currentPassword: string,
  newPassword: string
): Promise<*> =>
  fetchJSONWithCSRF("/api/v0/set_password/", {
    method: POST,
    body:   JSON.stringify({
      current_password: currentPassword,
      new_password:     newPassword
    })
  })

export function getSocialAuthTypes(): Promise<Array<SocialAuth>> {
  return fetchJSONWithAuthFailure("/api/v0/auths/")
}

export const getWidgetList = (
  widgetListId: number
): Promise<WidgetListResponse> =>
  fetchJSONWithAuthFailure(`/api/v0/widget_lists/${widgetListId}/`)

export const patchWidgetList = (
  widgetListId: number,
  payload: Object
): Promise<WidgetListResponse> =>
  fetchJSONWithAuthFailure(`/api/v0/widget_lists/${widgetListId}/`, {
    method: PATCH,
    body:   JSON.stringify(payload)
  })
