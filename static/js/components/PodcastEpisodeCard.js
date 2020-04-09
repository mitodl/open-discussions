// @flow
/* global SETTINGS:false */
import React from "react"
import Dotdotdot from "react-dotdotdot"

import Card from "./Card"

import { defaultResourceImageURL, embedlyThumbnail } from "../lib/url"

import type { Podcast, PodcastEpisode } from "../flow/podcastTypes"

export const PODCAST_IMG_HEIGHT = 77
export const PODCAST_IMG_WIDTH = 125

type Props = {
  podcast: Podcast,
  episode: PodcastEpisode
}

export default function PodcastEpisodeCard(props: Props) {
  const { episode, podcast } = props

  return (
    <Card className="podcast-episode-card low-padding">
      <div className="left-col">
        <div className="episode-title">
          <Dotdotdot clamp={2}>{episode.title}</Dotdotdot>
        </div>
        <div className="podcast-name">{podcast.title}</div>
        <div className="play-placeholder black-surround">Play</div>
      </div>
      <div className="right-col">
        <img
          src={embedlyThumbnail(
            SETTINGS.embedlyKey,
            episode.image_src || defaultResourceImageURL(),
            PODCAST_IMG_HEIGHT,
            PODCAST_IMG_WIDTH
          )}
          height={PODCAST_IMG_HEIGHT}
          alt={`cover image for ${episode.title}`}
          className="episode-cover-image"
        />
      </div>
    </Card>
  )
}
