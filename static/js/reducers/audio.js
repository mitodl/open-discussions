// @flow
import { createReducer, createAction } from "@reduxjs/toolkit"

import { AUDIO_PLAYER_PAUSED } from "../lib/constants"

export const INITIAL_AUDIO_STATE = {
  playerState:      AUDIO_PLAYER_PAUSED,
  currentlyPlaying: {
    title:       "",
    description: "",
    url:         ""
  }
}

export const setAudioPlayerState = createAction("SET_AUDIO_PLAYER_STATE")
export const setCurrentlyPlayingAudio = createAction(
  "SET_CURRENTLY_PLAYING_AUDIO"
)
export const stopAudioPlayer = createAction("STOP_AUDIO_PLAYER")

export const audio = createReducer(INITIAL_AUDIO_STATE, {
  [setAudioPlayerState]: (state, action) => {
    state.playerState = action.payload
  },
  [setCurrentlyPlayingAudio]: (state, action) => {
    state.currentlyPlaying = action.payload
  },
  [stopAudioPlayer]: () => Object.assign({}, INITIAL_AUDIO_STATE)
})
