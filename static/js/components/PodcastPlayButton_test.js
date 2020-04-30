// @flow
import { assert } from "chai"

import PodcastPlayButton from "./PodcastPlayButton"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makePodcastEpisode } from "../factories/podcasts"
import { AUDIO_PLAYER_PAUSED, AUDIO_PLAYER_PLAYING } from "../lib/constants"

describe("PodcastPlayButton", () => {
  let helper, render, episode

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    episode = makePodcastEpisode()
    render = helper.configureReduxQueryRenderer(PodcastPlayButton, { episode })
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should initialize a podcast", async () => {
    const { wrapper, store } = await render()
    wrapper.find(".podcast-play-button").simulate("click")
    assert.deepEqual(store.getState().audio, {
      playerState:      AUDIO_PLAYER_PLAYING,
      currentlyPlaying: {
        title:       episode.podcast_title,
        description: episode.title,
        url:         episode.url
      }
    })
  })

  it("should show black play button if not playing, not initialized", async () => {
    const { wrapper } = await render()
    assert.equal(wrapper.find(".podcast-play-button").text(), "Playplay_arrow")
    assert.equal(
      wrapper.find(".podcast-play-button").prop("className"),
      "podcast-play-button black-surround"
    )
  })

  it("should show grey pause button when initialized, playing", async () => {
    const { wrapper } = await render()
    wrapper.find(".podcast-play-button").simulate("click")
    assert.equal(wrapper.find(".podcast-play-button").text(), "Pausepause")
    assert.equal(
      wrapper.find(".podcast-play-button").prop("className"),
      "podcast-play-button grey-surround"
    )
  })

  it("should show black play button when initialized, paused", async () => {
    const { wrapper } = await render()
    wrapper.find(".podcast-play-button").simulate("click")
    wrapper.find(".podcast-play-button").simulate("click")
    assert.equal(wrapper.find(".podcast-play-button").text(), "Playplay_arrow")
    assert.equal(
      wrapper.find(".podcast-play-button").prop("className"),
      "podcast-play-button black-surround"
    )
  })

  it("should play / pause an initialized podcast", async () => {
    const { wrapper, store } = await render()
    wrapper.find(".podcast-play-button").simulate("click")
    assert.equal(store.getState().audio.playerState, AUDIO_PLAYER_PLAYING)
    wrapper.find(".podcast-play-button").simulate("click")
    assert.equal(store.getState().audio.playerState, AUDIO_PLAYER_PAUSED)
  })
})
