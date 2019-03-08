// @flow
import R from "ramda"
import qs from "query-string"

import type { Post } from "../flow/discussionTypes"

export const channelURL = (channelName: string) => `/c/${channelName}`

export const channelAboutURL = (channelName: string) =>
  `/c/${channelName}/about`

export const channelModerationURL = (channelName: string) =>
  `/manage/c/edit/${channelName}/moderation/`

export const editChannelBasicURL = (channelName: string) =>
  `/manage/c/edit/${channelName}/basic/`

export const editChannelAppearanceURL = (channelName: string) =>
  `/manage/c/edit/${channelName}/appearance/`

export const editChannelModeratorsURL = (channelName: string) =>
  `/manage/c/edit/${channelName}/members/moderators/`

export const editChannelContributorsURL = (channelName: string) =>
  `/manage/c/edit/${channelName}/members/contributors/`

export const postDetailURL = (
  channelName: string,
  postID: string,
  postSlug?: string
) => `/c/${channelName}/${postID}${postSlug ? `/${postSlug}` : ""}`

export const newPostURL = (channelName: ?string) =>
  channelName ? `/create_post/${channelName}` : "/create_post/"

export const profileURL = (username: string, selectedTab: ?string) =>
  selectedTab ? `/profile/${username}/${selectedTab}` : `/profile/${username}/`

export const editProfileURL = (username: string) => `/profile/${username}/edit`

export const commentPermalink = R.curry(
  (channelName: string, postID: string, postSlug: string, commentID: string) =>
    `${postDetailURL(channelName, postID, postSlug)}/comment/${commentID}/`
)

export const channelSearchURL = (channelName: string) =>
  `/c/${channelName}/search/`

export const blankThumbnailUrl = () =>
  new URL("/static/images/blank.png", window.location.origin).toString()

export const embedlyThumbnail = (
  key: string,
  url: string,
  height: number,
  width: number
) =>
  `https://i.embed.ly/1/display/crop/?key=${key}&url=${encodeURIComponent(
    url
  )}&height=${height}&width=${width}&grow=true&errorurl=${blankThumbnailUrl()}`

export const embedlyResizeImage = (key: string, url: string, height: number) =>
  `https://i.embed.ly/1/display/resize/?key=${key}&url=${encodeURIComponent(
    url
  )}&height=${height}&grow=false&errorurl=${blankThumbnailUrl()}`

export const absolutizeURL = (url: string) =>
  new URL(url, window.location.origin).toString()

export const postPermalink = (post: Post): string =>
  absolutizeURL(postDetailURL(post.channel_name, post.id, post.slug))

export const siteSearchURL = (): string => "/search/"
export const coursesURL = (): string => "/courses/"

// pull the channel name out of location.pathname
// see here for why this hackish approach was necessary:
// https://github.com/mitodl/open-discussions/pull/118#discussion_r135284591
export const getChannelNameFromPathname = R.compose(
  R.defaultTo(null),
  R.view(R.lensIndex(2)),
  R.match(/c\/(edit\/)?([^/]+)\/?/)
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
export const LOGIN_PROVIDER_URL = "/login/external/"

export const REGISTER_URL = "/signup/"
export const REGISTER_CONFIRM_URL = "/signup/confirm/"
export const REGISTER_DETAILS_URL = "/signup/details/"

export const INACTIVE_USER_URL = "/account/inactive/"

export const TOUCHSTONE_URL = "/login/saml/?idp=default"
export const MICROMASTERS_URL = "/login/micromasters/"

export const TERMS_OF_SERVICE_URL = "/terms-and-conditions"
export const PRIVACY_POLICY_URL = "/privacy-statement"

export const toQueryString = (params: Object) =>
  R.isEmpty(params || {}) ? "" : `?${qs.stringify(params)}`

export const urlHostname = (url: ?string) =>
  url ? new URL(url).hostname.replace(/^www\.(.*\.\w)/i, "$1") : ""

export const getNextParam = (search: string) => qs.parse(search).next || "/"
