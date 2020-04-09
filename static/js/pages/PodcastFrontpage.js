// @flow
import React from "react"
import { useRequest } from "redux-query-react"
import { useSelector } from "react-redux"

import PodcastEpisodeCard from "../components/PodcastEpisodeCard"

import {
  podcastsRequest,
  podcastsSelector,
  recentPodcastEpisodesRequest,
  recentEpisodesSelector
} from "../lib/queries/podcasts"

export default function PodcastFrontpage() {
  const [{ isFinished: isFinishedPodcasts }] = useRequest(podcastsRequest())
  const [{ isFinished: isFinishedRecent }] = useRequest(
    recentPodcastEpisodesRequest()
  )

  const loaded = isFinishedPodcasts && isFinishedRecent

  const podcasts = useSelector(podcastsSelector)
  const recentEpisodes = useSelector(recentEpisodesSelector)

  return (
    <div className="podcasts">
      <div className="recent-episodes">
        <div className="recent-header">
          <div className="title">RECENT EPISODES</div>
        </div>
        {loaded ? (
          <>
            {recentEpisodes
              .slice(0, 6)
              .map((episode, idx) => (
                <PodcastEpisodeCard
                  episode={episode}
                  podcast={podcasts[episode.podcast]}
                  key={idx}
                />
              ))}
          </>
        ) : null}
      </div>
      <h1>PODCASTS</h1>
      {loaded
        ? Object.values(podcasts).map((podcast: any, idx) => (
          <div key={idx}>
            <h3>{podcast.title}</h3>
          </div>
        ))
        : null}
    </div>
  )
}
