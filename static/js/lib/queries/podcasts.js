// @flow
import R from "ramda"
import { createSelector } from "reselect"

import {
  podcastApiURL,
  recentPodcastApiURL,
  podcastDetailApiURL,
  podcastEpisodeDetailApiURL
} from "../url"

import { DEFAULT_POST_OPTIONS, constructIdMap } from "../redux_query"

import type { Podcast, PodcastEpisode } from "../../flow/podcastTypes"

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

export const podcastRequest = (podcastId: number) => ({
  queryKey:  `podcastRequest${podcastId}`,
  url:       podcastDetailApiURL.param({ podcastId }).toString(),
  transform: (podcast: any) => ({
    podcasts: constructIdMap([podcast])
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

export const podcastEpisodeRequest = (episodeId: number) => ({
  queryKey:  `podcastRequest${episodeId}`,
  url:       podcastEpisodeDetailApiURL.param({ episodeId }).toString(),
  transform: (episode: any) => ({
    podcastEpisodes: constructIdMap([episode])
  }),
  update: {
    podcastEpisodes: R.merge
  }
})

export const recentEpisodesSelector = createSelector(
  state => state.entities.podcastEpisodes,
  state => state.entities.recentEpisodes,
  (episodes, recentEpisodes) =>
    episodes && recentEpisodes ? recentEpisodes.map(id => episodes[id]) : []
)

export const podcastEpisodesSelector = createSelector(
  state => state.entities.podcastEpisodes,
  podcastEpisodes => podcastEpisodes
)

export const favoritePodcastMutation = (podcast: Podcast) => ({
  queryKey: "podcastMutation",
  url:      `${podcastDetailApiURL.param({ podcastId: podcast.id }).toString()}${
    podcast.is_favorite ? "/unfavorite" : "/favorite"
  }/`,
  transform: () => {
    const updatedPodcast = {
      ...podcast,
      is_favorite: !podcast.is_favorite
    }

    console.log(updatedPodcast)
    return {
      podcasts: {
        [updatedPodcast.id]: updatedPodcast
      }
    }
  },
  update: {
    podcasts: R.mergeDeepRight
  },
  options: {
    method: "POST",
    ...DEFAULT_POST_OPTIONS
  }
})

export const favoritePodcastEpisodeMutation = (
  podcastEpisode: PodcastEpisode
) => ({
  queryKey: "podcastEpisodeMutation",
  url:      `${podcastEpisodeDetailApiURL
    .param({ episodeId: podcastEpisode.id })
    .toString()}${podcastEpisode.is_favorite ? "/unfavorite" : "/favorite"}/`,
  transform: () => {
    const updatedPodcastEpisode = {
      ...podcastEpisode,
      is_favorite: !podcastEpisode.is_favorite
    }

    return {
      podcastEpisodes: {
        [updatedPodcastEpisode.id]: updatedPodcastEpisode
      }
    }
  },
  update: {
    podcastEpisodes: R.mergeDeepRight
  },
  options: {
    method: "POST",
    ...DEFAULT_POST_OPTIONS
  }
})
