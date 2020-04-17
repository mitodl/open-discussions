// @flow
import React from "react"
import { useRequest } from "redux-query-react"
import { useSelector } from "react-redux"

import PodcastEpisodeCard from "../components/PodcastEpisodeCard"
import PodcastCard from "../components/PodcastCard"
import { Cell, Grid } from "../components/Grid"
import { PostLoading } from "../components/Loading"

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

  const podcasts = useSelector(podcastsSelector)
  const recentEpisodes = useSelector(recentEpisodesSelector)

  return (
    <div className="podcasts">
      <div className="recent-episodes">
        <div className="recent-header">
          <div className="title">RECENT EPISODES</div>
        </div>
        {isFinishedRecent && isFinishedPodcasts ? (
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
        ) : (
          <PostLoading />
        )}
      </div>
      <div className="all-podcasts">
        <h1>Podcasts Series</h1>
        {isFinishedPodcasts ? (
          <Grid>
            {Object.values(podcasts).map((podcast: any) => (
              <Cell width={4} key={podcast.id}>
                <PodcastCard podcast={podcast} />
              </Cell>
            ))}
          </Grid>
        ) : (
          <PostLoading />
        )}
      </div>
    </div>
  )
}
