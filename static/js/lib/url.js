// @flow
import R from "ramda"
import qs from "query-string"

import type { Post } from "../flow/discussionTypes"

export const channelURL = (channelName: string) => `/c/${channelName}`

export const channelModerationURL = (channelName: string) =>
  `/moderation/c/${channelName}`

export const editChannelBasicURL = (channelName: string) =>
  `/manage/c/edit/${channelName}/basic/`

export const editChannelAppearanceURL = (channelName: string) =>
  `/manage/c/edit/${channelName}/appearance/`

export const postDetailURL = (
  channelName: string,
  postID: string,
  postSlug?: string
) => `/c/${channelName}/${postID}${postSlug ? `/${postSlug}` : ""}`

export const newPostURL = (channelName: ?string) =>
  channelName ? `/create_post/${channelName}` : "/create_post/"

export const profileURL = (username: string) => `/profile/${username}/`

export const editProfileURL = (username: string) => `/profile/${username}/edit`

export const commentPermalink = R.curry(
  (channelName: string, postID: string, postSlug: string, commentID: string) =>
    `${postDetailURL(channelName, postID, postSlug)}/comment/${commentID}/`
)

export const postPermalink = (post: Post): string =>
  new URL(
    postDetailURL(post.channel_name, post.id),
    window.location.origin
  ).toString()

// pull the channel name out of location.pathname
// see here for why this hackish approach was necessary:
// https://github.com/mitodl/open-discussions/pull/118#discussion_r135284591
export const getChannelNameFromPathname = R.compose(
  R.defaultTo(null),
  R.view(R.lensIndex(1)),
  R.match(/c\/([^/]+)\/?/)
)

export const FRONTPAGE_URL = "/"
export const AUTH_REQUIRED_URL = "/auth_required/"
export const CONTENT_POLICY_URL = "/content_policy/"
export const SETTINGS_URL = "/settings/"
export const NOTIFICATION_SETTINGS_URL = "/settings/notifications"
export const ACCOUNT_SETTINGS_URL = "/settings/account"
export const PASSWORD_RESET_URL = "/password_reset/"
export const PASSWORD_CHANGE_URL = "/settings/password"

// auth urls
export const LOGIN_URL = "/login/"
export const LOGIN_PASSWORD_URL = "/login/password/"

export const REGISTER_URL = "/register/"
export const REGISTER_CONFIRM_URL = "/register/confirm/"
export const REGISTER_DETAILS_URL = "/register/details/"

export const INACTIVE_USER_URL = "/account/inactive/"

export const TOUCHSTONE_URL = "/login/saml/?idp=default"

export const toQueryString = (params: Object) =>
  R.isEmpty(params || {}) ? "" : `?${qs.stringify(params)}`

export const urlHostname = (url: ?string) => (url ? new URL(url).hostname : "")
