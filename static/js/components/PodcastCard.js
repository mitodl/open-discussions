// @flow
/* global SETTINGS:false */
import React from "react"
import Dotdotdot from "react-dotdotdot"

import Card from "./Card"

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
    <Card className="podcast-card borderless" onClick={openPodcastDrawer}>
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
        <div className="row podcast-author">{podcast.offered_by}</div>
      </div>
    </Card>
  )
}
