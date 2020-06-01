// @flow
import casual from "casual-browserify"

import { LR_TYPE_PODCAST, LR_TYPE_PODCAST_EPISODE } from "../lib/constants"
import { incrementer } from "../lib/util"

const incr = incrementer()
import type { Podcast, PodcastEpisode } from "../flow/podcastTypes"

export const makePodcast = (): Podcast => ({
  created_on:        casual.moment.toISOString(),
  episode_count:     casual.integer(2, 37),
  full_description:  casual.description,
  // $FlowFixMe: Flow thinks incr.next().value may be undefined, but it won't ever be
  id:                incr.next().value,
  image_src:         casual.url,
  offered_by:        [],
  podcast_id:        casual.word,
  short_description: casual.description,
  title:             casual.title,
  topics:            [],
  updated_on:        casual.moment.toISOString(),
  url:               casual.url,
  is_favorite:       casual.boolean,
  object_type:       LR_TYPE_PODCAST,
  audience:          [],
  certification:     []
})

export const makePodcastEpisode = (podcast?: Podcast): PodcastEpisode => {
  podcast = podcast || makePodcast()

  return {
    created_on:        casual.moment.toISOString(),
    episode_id:        casual.word,
    full_description:  casual.description,
    // $FlowFixMe: Flow thinks incr.next().value may be undefined
    id:                incr.next().value,
    image_src:         casual.url,
    last_modified:     casual.moment.toISOString(),
    offered_by:        [],
    podcast:           podcast.id,
    short_description: casual.description,
    title:             casual.title,
    podcast_title:     podcast.title,
    topics:            [],
    updated_on:        casual.moment.toISOString(),
    url:               casual.url,
    episode_link:      casual.url,
    is_favorite:       casual.boolean,
    object_type:       LR_TYPE_PODCAST_EPISODE,
    audience:          [],
    certification:     []
  }
}
