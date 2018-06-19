// @flow
import R from "ramda"
import qs from "query-string"

export const channelURL = (channelName: string) => `/channel/${channelName}`

export const channelModerationURL = (channelName: string) =>
  `/moderation/channel/${channelName}`

export const editChannelBasicURL = (channelName: string) =>
  `/manage/channel/edit/${channelName}/basic/`

export const editChannelAppearanceURL = (channelName: string) =>
  `/manage/channel/edit/${channelName}/appearance/`

export const postDetailURL = (channelName: string, postID: string) =>
  `/channel/${channelName}/${postID}`

export const newPostURL = (channelName: ?string) =>
  channelName ? `/create_post/${channelName}` : "/create_post/"

export const profileURL = (username: string) => `/profile/${username}/`

export const editProfileURL = (username: string) => `/profile/${username}/edit`

export const commentPermalink = R.curry(
  (channelName: string, postID: string, commentID: string) =>
    `${postDetailURL(channelName, postID)}/comment/${commentID}/`
)

// pull the channel name out of location.pathname
// see here for why this hackish approach was necessary:
// https://github.com/mitodl/open-discussions/pull/118#discussion_r135284591
export const getChannelNameFromPathname = R.compose(
  R.defaultTo(null),
  R.view(R.lensIndex(1)),
  R.match(/channel\/([^/]+)\/?/)
)

export const FRONTPAGE_URL = "/"
export const AUTH_REQUIRED_URL = "/auth_required/"
export const CONTENT_POLICY_URL = "/content_policy/"
export const SETTINGS_URL = "/settings/"

// auth urls
export const LOGIN_URL = "/login/"
export const LOGIN_PASSWORD_URL = "/login/password/"

export const REGISTER_URL = "/register/"
export const REGISTER_CONFIRM_URL = "/register/confirm/"
export const REGISTER_DETAILS_URL = "/register/details/"

export const INACTIVE_USER_URL = "/account/inactive/"

export const toQueryString = (params: Object) =>
  R.isEmpty(params || {}) ? "" : `?${qs.stringify(params)}`

export const urlHostname = (url: ?string) => (url ? new URL(url).hostname : "")
