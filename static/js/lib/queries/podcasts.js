// @flow
import R from "ramda"
import { createSelector } from "reselect"

import { podcastApiURL, recentPodcastApiURL } from "../url"
import { constructIdMap } from "../redux_query"

import type { PodcastEpisode } from "../../flow/podcastTypes"

export const podcastsRequest = () => ({
  queryKey:  "podcastsRequest",
  url:       podcastApiURL.toString(),
  transform: (podcasts: any) => ({
    podcasts: constructIdMap(podcasts)
  }),
  update: {
    podcasts: R.merge
  }
})

export const podcastsSelector = createSelector(
  state => state.entities.podcasts,
  podcasts => podcasts
)

export const recentPodcastEpisodesRequest = () => ({
  queryKey:  "recentPodcastRequest",
  url:       recentPodcastApiURL.toString(),
  transform: ({ results }: any) => {
    const recentEpisodes = results.map(episode => episode.id)

    return {
      recentEpisodes,
      podcastEpisodes: constructIdMap(results)
    }
  },
  update: {
    recentEpisodes:  (_: any, newList: Array<PodcastEpisode>) => newList,
    podcastEpisodes: R.merge
  }
})

export const recentEpisodesSelector = createSelector(
  state => state.entities.podcastEpisodes,
  state => state.entities.recentEpisodes,
  (episodes, recentEpisodes) =>
    episodes && recentEpisodes ? recentEpisodes.map(id => episodes[id]) : []
)
