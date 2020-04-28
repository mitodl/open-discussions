// @flow
import React, { useCallback } from "react"

import { useDispatch } from "react-redux"

import { useInitAudioPlayer } from "../hooks/audio_player"

import type { PodcastEpisode } from "../flow/podcastTypes"

type Props = {
  episode: PodcastEpisode
}

export default function PodcastPlayButton(props: Props) {
  const { episode } = props

  const dispatch = useDispatch()
  const initAudioPlayer = useInitAudioPlayer({
    title:       episode.podcast_title,
    description: episode.title,
    url:         episode.url
  })
  const playClick = useCallback(
    e => {
      e.stopPropagation()
      e.preventDefault()
      initAudioPlayer()
    },
    [dispatch]
  )

  return (
    <div className="podcast-play-button black-surround" onClick={playClick}>
      Play
      <i className="material-icons play_arrow">play_arrow</i>
    </div>
  )
}
