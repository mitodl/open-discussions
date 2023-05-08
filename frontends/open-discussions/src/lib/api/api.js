// @flow
/* global SETTINGS:false */
// For mocking purposes we need to use "fetch" defined as a global instead of importing as a local.
import { PATCH, POST, DELETE } from "redux-hammock/constants"
import { fetchJSONWithCSRF } from "redux-hammock/django_csrf_fetch"

import { buildSearchQuery } from "@mitodl/course-search-utils/dist/search"
import {
  fetchJSONWithAuthFailure,
  fetchWithAuthFailure,
  fetchJSONWithToken
} from "./fetch_auth"
import { getPaginationSortQS } from "./util"

import type { AuthResponse, AuthFlow } from "../../flow/authTypes"
import type {
  UserFeedComment,
  Post,
  Profile,
  ProfilePayload,
  SocialAuth,
  PostListPaginationParams
} from "../../flow/discussionTypes"
import type { NotificationSetting } from "../../flow/settingsTypes"
import type { SearchParams } from "../../flow/searchTypes"

import _ from "lodash"

export function search(params: SearchParams): Promise<*> {
  const searchParams = _.pick(params, [
    "text",
    "from",
    "size",
    "sort",
    "channelName",
    "resourceTypes"
  ])

  if (params["facets"]) {
    // $FlowFixMe
    searchParams["activeFacets"] = Object.fromEntries(params["facets"])
  }

  const body = buildSearchQuery(searchParams)

  return fetchJSONWithAuthFailure("/api/v0/search/", {
    method: POST,
    body:   JSON.stringify(body)
  })
}

export function getRelatedPosts(postId: string): Promise<*> {
  return fetchJSONWithAuthFailure(`/api/v0/related/${postId}/`, {
    method: POST
  })
}

export function getUserPosts(
  username: string,
  params: PostListPaginationParams
): Promise<Array<Post>> {
  return fetchJSONWithAuthFailure(
    `/api/v0/profiles/${username}/posts/${getPaginationSortQS(params)}`
  )
}

export function getUserComments(
  username: string,
  params: PostListPaginationParams
): Promise<Array<UserFeedComment>> {
  return fetchJSONWithAuthFailure(
    `/api/v0/profiles/${username}/comments/${getPaginationSortQS(params)}`
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

export const patchModeratorSetting = (
  setting: NotificationSetting,
  token: ?string = undefined
) =>
  token
    ? fetchJSONWithToken(
      "/api/v0/notification_settings/moderator_posts/",
      token,
      {
        method: PATCH,
        body:   JSON.stringify(setting)
      }
    )
    : fetchJSONWithAuthFailure(
      "/api/v0/notification_settings/moderator_posts/",
      {
        method: PATCH,
        body:   JSON.stringify(setting)
      }
    )

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
