// @flow
import R from "ramda"
import qs from "query-string"

export const channelURL = (channelName: string) => `/channel/${channelName}`

export const editChannelURL = (channelName: string) =>
  `/manage/channel/edit/${channelName}/`

export const postDetailURL = (channelName: string, postID: string) =>
  `/channel/${channelName}/${postID}`

export const newPostURL = (channelName: ?string) =>
  channelName ? `/create_post/${channelName}` : "/create_post/"

// pull the channel name out of location.pathname
// see here for why this hackish approach was necessary:
// https://github.com/mitodl/open-discussions/pull/118#discussion_r135284591
export const getChannelNameFromPathname = R.compose(
  R.defaultTo(null),
  R.view(R.lensIndex(1)),
  R.match(/^\/channel\/([^/]+)\/?/)
)

export const FRONTPAGE_URL = "/"
export const AUTH_REQUIRED_URL = "/auth_required/"
export const CONTENT_POLICY_URL = "/content_policy/"

export const toQueryString = (params: Object) =>
  R.isEmpty(params || {}) ? "" : `?${qs.stringify(params)}`

export const urlHostname = (url: ?string) => (url ? new URL(url).hostname : "")
