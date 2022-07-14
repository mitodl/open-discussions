// @flow
/* global SETTINGS:false */
import React from "react"
import Dotdotdot from "react-dotdotdot"

import { Card } from "ol-util"

import { defaultResourceImageURL, embedlyThumbnail } from "../lib/url"
import { CAROUSEL_IMG_WIDTH } from "../lib/constants"
import { useOpenPodcastDrawer } from "../hooks/podcasts"

import type { Podcast } from "../flow/podcastTypes"

type Props = {
  podcast: Podcast
}

export const PODCAST_IMG_HEIGHT = 170

export default function PodcastCard(props: Props) {
  const { podcast } = props

  const openPodcastDrawer = useOpenPodcastDrawer(podcast.id)

  return (
    <Card className="podcast-card borderless">
      <div
        id="podcast-card-inner-container"
        tabIndex="0"
        onKeyPress={e => {
          if (e.key === "Enter") {
            e.preventDefault()
            e.stopPropagation()
            openPodcastDrawer(e)
          }
        }}
        onClick={openPodcastDrawer}
      >
        <div className="cover-img">
          <img
            src={embedlyThumbnail(
              SETTINGS.embedlyKey,
              podcast.image_src || defaultResourceImageURL(),
              PODCAST_IMG_HEIGHT,
              CAROUSEL_IMG_WIDTH
            )}
            height={PODCAST_IMG_HEIGHT}
            alt={`cover image for ${podcast.title}`}
          />
        </div>
        <div className="podcast-info">
          <div className="row resource-type">PODCAST</div>
          <div className="row podcast-title">
            <Dotdotdot clamp={3}>{podcast.title}</Dotdotdot>
          </div>
          <div className="row podcast-author">
            <Dotdotdot clamp={2}>{podcast.offered_by}</Dotdotdot>
          </div>
          <div className="row podcast-episode-count">
            {podcast.episode_count} Episodes
          </div>
        </div>
      </div>
    </Card>
  )
}
