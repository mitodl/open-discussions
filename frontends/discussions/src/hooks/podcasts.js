// @flow
import { useCallback } from "react"
import { useDispatch } from "react-redux"

import { pushLRHistory } from "../actions/ui"
import { LR_TYPE_PODCAST, LR_TYPE_PODCAST_EPISODE } from "../lib/constants"

export function useOpenPodcastDrawer(podcastId: number) {
  const dispatch = useDispatch()

  const openPodcastDrawer = useCallback(
    (e: Event) => {
      e.preventDefault()

      dispatch(
        pushLRHistory({
          objectId:   podcastId,
          objectType: LR_TYPE_PODCAST
        })
      )
    },
    [dispatch, podcastId]
  )

  return openPodcastDrawer
}

export function useOpenEpisodeDrawer(episodeId: number) {
  const dispatch = useDispatch()

  const openEpisodeDrawer = useCallback(
    (e: Event) => {
      e.preventDefault()

      dispatch(
        pushLRHistory({
          objectId:   episodeId,
          objectType: LR_TYPE_PODCAST_EPISODE
        })
      )
    },
    [dispatch, episodeId]
  )

  return openEpisodeDrawer
}
