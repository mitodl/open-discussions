// @flow
import { assert } from "chai"
import sinon from "sinon"

import PodcastPlayButton from "./PodcastPlayButton"

import IntegrationTestHelper from "../util/integration_test_helper"
import * as audioPlayerHooks from "../hooks/audio_player"
import { makePodcastEpisode } from "../factories/podcasts"
import { wait } from "../lib/util"
import { setAudioPlayerState, setCurrentlyPlayingAudio } from "../actions/audio"
import { AUDIO_PLAYER_PAUSED, AUDIO_PLAYER_PLAYING } from "../lib/constants"

describe("PodcastPlayButton", () => {
  let helper, render, episode, initAudioPlayerStub, initAudioPlayerCBStub

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
    await wait(100)

    assert.deepEqual(store.getState().audio, {
      playerState:      AUDIO_PLAYER_PLAYING,
      currentlyPlaying: {
        title:       episode.podcast_title,
        description: episode.title,
        url:         episode.url
      }
    })
  })

  it("should show play button if not playing, not initialized", async () => {
    const { wrapper } = await render()
    assert.equal(wrapper.find(".podcast-play-button").text(), "Playplay_arrow")
  })

  it("should show pause button when initialized, playing", async () => {
    const { wrapper } = await render({}, [
      setCurrentlyPlayingAudio({
        title:       episode.podcast_title,
        description: episode.title,
        url:         episode.url
      }),
      setAudioPlayerState(AUDIO_PLAYER_PLAYING)
    ])
    assert.equal(wrapper.find(".podcast-play-button").text(), "Pausepause")
  })

  it("should show play button when initialized, paused", async () => {
    const { wrapper } = await render({}, [
      setCurrentlyPlayingAudio({
        title:       episode.podcast_title,
        description: episode.title,
        url:         episode.url
      })
    ])
    assert.equal(wrapper.find(".podcast-play-button").text(), "Playplay_arrow")
  })

  it("should play / pause an initialized podcast", async () => {
    const { wrapper, store } = await render()
    wrapper.find(".podcast-play-button").simulate("click")
    assert.equal(store.getState().audio.playerState, AUDIO_PLAYER_PLAYING)
    wrapper.find(".podcast-play-button").simulate("click")
    assert.equal(store.getState().audio.playerState, AUDIO_PLAYER_PAUSED)
  })
})
