// @flow
import R from "ramda"
import { createSelector } from "reselect"

import { videoApiURL, newVideosURL } from "../url"
import { DEFAULT_POST_OPTIONS, constructIdMap } from "../redux_query"

import type { Video } from "../../flow/discussionTypes"

export const videoRequest = (videoId: number) => ({
  queryKey:  `videoRequest${videoId}`,
  url:       `${videoApiURL}/${videoId}/`,
  transform: (video: any) => ({
    videos: { [video.id]: video }
  }),
  update: {
    videos: R.merge
  }
})

export const videosRequest = () => ({
  queryKey:  "videosRequest",
  url:       videoApiURL,
  transform: (body: ?{ results: Array<Video> }) => ({
    videos: body ? constructIdMap(body.results) : {}
  }),
  update: {
    videos: R.merge
  }
})

export const newVideosRequest = () => ({
  queryKey:  "newVideosRequest",
  url:       newVideosURL,
  transform: (body: ?{ results: Array<Video> }) => ({
    videos:    body ? constructIdMap(body.results) : {},
    newVideos: body ? body.results.map<number>(result => result.id) : []
  }),
  update: {
    videos:    R.merge,
    newVideos: (prev: Array<number>, next: Array<number>) => next
  }
})

export const videosSelector = createSelector(
  state => state.entities.videos,
  videos => videos
)

export const newVideosSelector = createSelector(
  state => state.entities.videos,
  state => state.entities.newVideos,
  (videos, newVideos) =>
    newVideos && videos ? newVideos.map(id => videos[id]) : null
)

export const favoriteVideoMutation = (video: Video) => ({
  queryKey: "videoMutation",
  url:      `${videoApiURL}/${video.id}/${
    video.is_favorite ? "unfavorite" : "favorite"
  }/`,
  transform: () => {
    const updatedvideo = {
      ...video,
      is_favorite: !video.is_favorite
    }

    return {
      videos: {
        [updatedvideo.id]: updatedvideo
      }
    }
  },
  update: {
    videos: R.mergeDeepRight
  },
  options: {
    method: "POST",
    ...DEFAULT_POST_OPTIONS
  }
})
