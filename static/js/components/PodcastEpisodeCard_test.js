// @flow
/* global SETTINGS:false */
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"

import { makePodcast, makePodcastEpisode } from "../factories/podcasts"
import { embedlyThumbnail } from "../lib/url"

import PodcastEpisodeCard, {
  PODCAST_IMG_WIDTH,
  PODCAST_IMG_HEIGHT
} from "./PodcastEpisodeCard"

describe("PodcastEpisodeCard", () => {
  let podcast, episode
  beforeEach(() => {
    podcast = makePodcast()
    episode = makePodcastEpisode(podcast)
  })

  const render = (props = {}) =>
    shallow(
      <PodcastEpisodeCard podcast={podcast} episode={episode} {...props} />
    )

  it("should render basic stuff", () => {
    const wrapper = render()
    assert.equal(wrapper.find("Dotdotdot").props().children, episode.title)
    assert.equal(wrapper.find(".podcast-name").text(), podcast.title)
    assert.equal(
      wrapper.find("img").prop("src"),
      embedlyThumbnail(
        SETTINGS.embedlyKey,
        episode.image_src,
        PODCAST_IMG_HEIGHT,
        PODCAST_IMG_WIDTH
      )
    )
  })
})
