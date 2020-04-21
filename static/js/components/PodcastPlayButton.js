// @flow
import React, { useCallback } from "react"

import { useDispatch } from "react-redux"

import { setCurrentlyPlayingAudio } from "../actions/audio"

import type { PodcastEpisode } from "../flow/podcastTypes"

type Props = {
  episode: PodcastEpisode
}

export default function PodcastPlayButton(props: Props) {
  const { episode } = props

  const dispatch = useDispatch()
  const playClick = useCallback(
    e => {
      e.stopPropagation()
      e.preventDefault()
      dispatch(
        setCurrentlyPlayingAudio({
          title:       episode.podcast_title,
          description: episode.title,
          url:         episode.url
        })
      )
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
