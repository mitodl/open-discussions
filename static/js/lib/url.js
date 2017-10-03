// @flow
import R from "ramda"

export const channelURL = (channelName: string) => `/channel/${channelName}`

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
