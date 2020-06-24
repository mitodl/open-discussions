// @flow
import { createReducer } from "@reduxjs/toolkit"

import { setAudioPlayerState, setCurrentlyPlayingAudio } from "../actions/audio"
import { AUDIO_PLAYER_PAUSED } from "../lib/constants"

export type Audio = {
  title: string,
  description: string,
  url: string
}
export type AudioState = {
  currentlyPlaying: Audio
}
export const INITIAL_AUDIO_STATE: AudioState = {
  playerState:      AUDIO_PLAYER_PAUSED,
  currentlyPlaying: {
    title:       "",
    description: "",
    url:         ""
  }
}

export const audio = createReducer(INITIAL_AUDIO_STATE, {
  // $FlowFixMe
  [setAudioPlayerState]: (state, action) => {
    state.playerState = action.payload
  },
  // $FlowFixMe
  [setCurrentlyPlayingAudio]: (state, action) => {
    state.currentlyPlaying = action.payload
  }
})
