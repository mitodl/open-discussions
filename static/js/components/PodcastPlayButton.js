// @flow
import React, { useCallback } from "react"
import { useSelector } from "react-redux"
import Amplitude from "amplitudejs"

import { useInitAudioPlayer } from "../hooks/audio_player"
import {
  audioPlayerStateSelector,
  currentlyPlayingAudioSelector
} from "../lib/redux_selectors"
import { AUDIO_PLAYER_PLAYING } from "../lib/constants"

import type { PodcastEpisode } from "../flow/podcastTypes"

type Props = {
  episode: PodcastEpisode
}

export default function PodcastPlayButton(props: Props) {
  const { episode } = props

  const audioPlayerState = useSelector(audioPlayerStateSelector)
  const currentlyPlayingAudio = useSelector(currentlyPlayingAudioSelector)

  const episodeAudioInitialized = currentlyPlayingAudio.url === episode.url
  const episodeCurrentlyPlaying =
    episodeAudioInitialized && audioPlayerState === AUDIO_PLAYER_PLAYING

  const initAudioPlayer = useInitAudioPlayer({
    title:       episode.podcast_title,
    description: episode.title,
    url:         episode.url
  })

  const initializeAudioPlayer = useCallback(
    e => {
      e.stopPropagation()
      e.preventDefault()
      initAudioPlayer()
    },
    [initAudioPlayer]
  )

  const togglePlayState = e => {
    e.stopPropagation()
    e.preventDefault()

    const audioElement = Amplitude.getAudio()
    if (audioPlayerState === AUDIO_PLAYER_PLAYING) {
      audioElement.pause()
    } else {
      audioElement.play()
    }
  }

  const className = episodeCurrentlyPlaying ? "grey-surround" : "black-surround"

  return (
    <div
      className={`podcast-play-button ${className}`}
      onClick={
        episodeAudioInitialized ? togglePlayState : initializeAudioPlayer
      }
    >
      {episodeCurrentlyPlaying ? (
        <>
          Pause
          <i className="material-icons pause">pause</i>
        </>
      ) : (
        <>
          Play
          <i className="material-icons play_arrow">play_arrow</i>
        </>
      )}
    </div>
  )
}
