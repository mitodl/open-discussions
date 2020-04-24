// @flow
import { createAction } from "redux-actions"

export const SET_CURRENTLY_PLAYING_AUDIO = "SET_CURRENTLY_PLAYING_AUDIO"
export const setCurrentlyPlayingAudio = createAction<string, *>(
  SET_CURRENTLY_PLAYING_AUDIO
)
