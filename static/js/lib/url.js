// @flow

export const channelURL = (channelName: string) => `/channel/${channelName}`

export const postDetailURL = (channelName: string, postID: string) => `/channel/${channelName}/${postID}`

export const newPostURL = (channelName: string) => `/create_post/${channelName}`
