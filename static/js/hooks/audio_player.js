// @flow
import { useCallback } from "react"
import { useDispatch } from "react-redux"
import Amplitude from "amplitudejs"

import {
  setAudioPlayerState,
  setCurrentlyPlayingAudio,
  stopAudioPlayer
} from "../reducers/audio"
import { AUDIO_PLAYER_PAUSED, AUDIO_PLAYER_PLAYING } from "../lib/constants"

export function useInitAudioPlayer(audio: Object) {
  const dispatch = useDispatch()

  const initAudioPlayer = useCallback(
    () => {
      dispatch(setCurrentlyPlayingAudio(audio))
      if (Amplitude.getAudio()) {
        Amplitude.getAudio().pause()
      }

      Amplitude.init({
        bindings: {
          [32]: "play_pause"
        },
        songs: [
          {
            album: audio.title,
            name:  audio.description,
            url:   audio.url
          }
        ]
      })
      const audioElement = Amplitude.getAudio()
      audioElement.pause()
      audioElement.addEventListener("play", () => {
        dispatch(setAudioPlayerState(AUDIO_PLAYER_PLAYING))
      })
      audioElement.addEventListener("pause", () => {
        dispatch(setAudioPlayerState(AUDIO_PLAYER_PAUSED))
      })
      audioElement.play()
    },
    [dispatch, audio]
  )

  return initAudioPlayer
}

export function useStopAudioPlayer() {
  const dispatch = useDispatch()

  const stopAudioPlayerCB = useCallback(
    () => {
      if (Amplitude.getAudio()) {
        Amplitude.getAudio().pause()
      }
      dispatch(stopAudioPlayer())
    },
    [dispatch]
  )

  return stopAudioPlayerCB
}
