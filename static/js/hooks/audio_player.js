// @flow
import { useCallback } from "react"
import { useDispatch } from "react-redux"
import Amplitude from "amplitudejs"

import { setAudioPlayerState, setCurrentlyPlayingAudio } from "../actions/audio"

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
        dispatch(setAudioPlayerState("playing"))
      })
      audioElement.addEventListener("pause", () => {
        dispatch(setAudioPlayerState("paused"))
      })
      audioElement.play()
    },
    [dispatch, audio]
  )

  return initAudioPlayer
}
