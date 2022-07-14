// @flow
/* global SETTINGS:false */
import React from "react"
import Dotdotdot from "react-dotdotdot"
import moment from "moment"

import { Card } from "ol-util"
import PodcastPlayButton from "./PodcastPlayButton"

import { defaultResourceImageURL, embedlyThumbnail } from "../lib/url"
import { useOpenEpisodeDrawer } from "../hooks/podcasts"

import type { Podcast, PodcastEpisode } from "../flow/podcastTypes"

export const PODCAST_IMG_HEIGHT = 77
export const PODCAST_IMG_WIDTH = 125

type Props = {
  podcast: Podcast,
  episode: PodcastEpisode,
  persistentShadow?: boolean
}

export const EPISODE_DATE_FORMAT = "MMMM D, YYYY"

export default function PodcastEpisodeCard(props: Props) {
  const { episode, podcast, persistentShadow } = props

  const openEpisodeDrawer = useOpenEpisodeDrawer(episode.id)

  return (
    <Card
      className="podcast-episode-card low-padding"
      persistentShadow={persistentShadow}
    >
      <div
        id="podcast-episode-card-inner-container"
        tabIndex="0"
        onKeyPress={e => {
          if (e.key === "Enter") {
            openEpisodeDrawer(e)
          }
        }}
        onClick={openEpisodeDrawer}
      >
        <div className="left-col">
          <div className="episode-title">
            <Dotdotdot clamp={2}>{episode.title}</Dotdotdot>
          </div>
          <div className="podcast-name">{podcast.title}</div>
          <div className="play-date-row">
            <PodcastPlayButton episode={episode} />
            <div className="date">
              {moment(episode.last_modified).format(EPISODE_DATE_FORMAT)}
            </div>
          </div>
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
      </div>
    </Card>
  )
}
