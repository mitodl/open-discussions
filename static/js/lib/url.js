// @flow
import R from "ramda"

export const channelURL = (channelName: string) => `/channel/${channelName}`

export const postDetailURL = (channelName: string, postID: string) =>
  `/channel/${channelName}/${postID}`

export const newPostURL = (channelName: string) => `/create_post/${channelName}`

export const frontPageURL = () => "/"

// pull the channel name out of location.pathname
export const getChannelNameFromPathname = R.compose(
  R.defaultTo(null),
  R.view(R.lensIndex(1)),
  R.match(/^\/channel\/([a-z]+)\/?/)
)
