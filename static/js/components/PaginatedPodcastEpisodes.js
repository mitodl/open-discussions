// @flow
import React, { useState, useMemo } from "react"
import { useRequest } from "redux-query-react"
import { useSelector } from "react-redux"
import { createSelector } from "reselect"

import { Loading } from "../components/Loading"
import PodcastEpisodeCard from "./PodcastEpisodeCard"
import LRDrawerPaginationControls from "./LRDrawerPaginationControls"

import {
  podcastEpisodesRequest,
  podcastEpisodesKey
} from "../lib/queries/podcasts"

import type { Podcast } from "../flow/podcastTypes"

const SimpleLoader = <Loading className="infinite" key="loader" />

type Props = {
  podcast: Podcast,
  pageSize: number
}

export default function PaginatedPodcastEpisodes({ podcast, pageSize }: Props) {
  const [page, setPage] = useState(0)
  const begin = page * pageSize
  const end = begin + pageSize

  const [{ isFinished }] = useRequest(
    podcastEpisodesRequest(podcast.id, begin, pageSize)
  )

  const selector = useMemo(
    () => {
      const key = podcastEpisodesKey(podcast.id)

      return createSelector(
        state => state.entities.podcastEpisodes,
        state => state.entities[key],
        (podcastEpisodes, podcastSpecificState) => {
          if (!podcastSpecificState) {
            return {}
          }

          const { items, count } = podcastSpecificState

          return {
            episodes: items.map(item => podcastEpisodes[item]),
            count
          }
        }
      )
    },
    [podcast]
  )

  const { episodes, count } = useSelector(selector)

  return isFinished && episodes ? (
    <div className="paginated-podcast-episodes">
      {episodes
        .slice(begin, end)
        .map(episode => (
          <PodcastEpisodeCard
            episode={episode}
            podcast={podcast}
            persistentShadow
            key={episode.id}
          />
        ))}
      <LRDrawerPaginationControls
        page={page}
        begin={begin}
        setPage={setPage}
        count={count}
        end={end}
      />
    </div>
  ) : (
    SimpleLoader
  )
}
