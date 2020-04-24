// @flow
/* global SETTINGS:false */
import { safeBulkGet } from "../lib/maps"
import { createSelector } from "reselect"

import type { Channel } from "../flow/discussionTypes"
import type { Profile } from "../flow/discussionTypes"

export const getSubscribedChannels = (state: Object): Array<Channel> =>
  state.subscribedChannels.loaded
    ? safeBulkGet(state.subscribedChannels.data, state.channels.data)
    : []

export const getOwnProfile = (state: Object): ?Profile =>
  SETTINGS.username ? state.profiles.data.get(SETTINGS.username) : null

export const getAudioPlayerState = (state: Object): any =>
  state.audio.playerState

export const audioPlayerStateSelector = createSelector(
  state => state.audio,
  audio => audio.playerState
)

export const getCurrentlyPlayingAudio = (state: Object): any =>
  state.audio.currentlyPlaying

export const currentlyPlayingAudioSelector = createSelector(
  state => state.audio,
  audio => audio.currentlyPlaying
)
