// @flow
import { useCallback } from "react"
import { useDispatch } from "react-redux"
import Amplitude from "amplitudejs"

import { setAudioPlayerState, setCurrentlyPlayingAudio } from "../actions/audio"
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
