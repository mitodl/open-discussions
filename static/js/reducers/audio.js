// @flow
import { SET_CURRENTLY_PLAYING_AUDIO } from "../actions/audio"
import type { Action } from "../flow/reduxTypes"

export type Audio = {
  title: string,
  description: string,
  url: string
}
export type AudioState = {
  currentlyPlaying: Audio
}
export const INITIAL_AUDIO_STATE: AudioState = {
  currentlyPlaying: {
    title:       "",
    description: "",
    url:         ""
  }
}

export const audio = (
  state: AudioState = INITIAL_AUDIO_STATE,
  action: Action<any, null>
): AudioState => {
  switch (action.type) {
  case SET_CURRENTLY_PLAYING_AUDIO:
    return { ...state, currentlyPlaying: action.payload }
  }
  return state
}
