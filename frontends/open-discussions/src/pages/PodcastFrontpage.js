// @flow
import React from "react"

import { MetaTags } from "ol-util"

import { useRequest } from "redux-query-react"
import { useSelector } from "react-redux"

import PodcastEpisodeCard from "../components/PodcastEpisodeCard"
import PodcastCard from "../components/PodcastCard"
import { Cell, Grid } from "../components/Grid"
import { PodcastLoading, PodcastEpisodeLoading } from "../components/Loading"
import PodcastFooter from "../components/PodcastFooter"
import PodcastSubscribeButton from "../components/PodcastSubscribeButton"

import { formatTitle } from "../lib/title"
import {
  podcastsRequest,
  podcastsSelector,
  recentPodcastEpisodesRequest,
  recentEpisodesSelector
} from "../lib/queries/podcasts"
import { useLearningResourcePermalink } from "../hooks/learning_resources"
import { PODCAST_RSS_URL, PODCAST_GOOGLE_URL } from "../lib/url"

export default function PodcastFrontpage() {
  const [{ isFinished: isFinishedPodcasts }] = useRequest(podcastsRequest())
  const [{ isFinished: isFinishedRecent }] = useRequest(
    recentPodcastEpisodesRequest()
  )

  const podcasts = useSelector(podcastsSelector)
  const recentEpisodes = useSelector(recentEpisodesSelector)

  useLearningResourcePermalink()

  // prevent spacebar from scrolling the page
  window.addEventListener("keydown", e => {
    if (e.key === " ") {
      e.stopPropagation()
      e.preventDefault()
    }
  })

  return (
    <div className="podcasts">
      <MetaTags>
        <title>{formatTitle("Podcasts")}</title>
      </MetaTags>

      <div className="recent-episodes">
        <div className="recent-header">
          <div className="title">RECENT EPISODES</div>
        </div>
        <div className="subscribe-button-div">
          <PodcastSubscribeButton
            buttonText="Subscribe to new episodes"
            rssUrl={`${window.location.origin.toString()}${PODCAST_RSS_URL}`}
            googleUrl={PODCAST_GOOGLE_URL}
          />
        </div>
        {isFinishedRecent && isFinishedPodcasts ? (
          <>
            {recentEpisodes.slice(0, 6).map((episode, idx) => (
              <PodcastEpisodeCard
                episode={episode}
                podcast={podcasts[episode.podcast]}
                key={idx}
              />
            ))}
          </>
        ) : (
          <PodcastEpisodeLoading />
        )}
      </div>
      <div className="all-podcasts">
        <h1>Podcasts</h1>
        {isFinishedPodcasts ? (
          <Grid>
            {Object.values(podcasts).map((podcast: any) => (
              <Cell width={4} key={podcast.id}>
                <PodcastCard podcast={podcast} />
              </Cell>
            ))}
          </Grid>
        ) : (
          <PodcastLoading />
        )}
      </div>
      <PodcastFooter />
    </div>
  )
}
