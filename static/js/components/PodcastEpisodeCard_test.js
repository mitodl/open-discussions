// @flow
/* global SETTINGS:false */
import React from "react"
import { Provider } from "react-redux"
import { mount } from "enzyme"
import { assert } from "chai"

import { makePodcast, makePodcastEpisode } from "../factories/podcasts"
import { embedlyThumbnail } from "../lib/url"
import IntegrationTestHelper from "../util/integration_test_helper"

import PodcastEpisodeCard, {
  PODCAST_IMG_WIDTH,
  PODCAST_IMG_HEIGHT
} from "./PodcastEpisodeCard"

describe("PodcastEpisodeCard", () => {
  let podcast, episode, render, helper
  beforeEach(() => {
    podcast = makePodcast()
    episode = makePodcastEpisode(podcast)
    helper = new IntegrationTestHelper()
    render = helper.configureReduxQueryRenderer(PodcastEpisodeCard, {
      podcast: podcast,
      episode: episode
    })
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render basic stuff", async () => {
    const { wrapper } = await render()
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
