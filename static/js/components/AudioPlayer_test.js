import React from "react"
import { Provider } from "react-redux"
import { assert } from "chai"
import { mount } from "enzyme"

import AudioPlayer from "./AudioPlayer"
import Amplitude from "amplitudejs"
import {
  SET_CURRENTLY_PLAYING_AUDIO,
  setCurrentlyPlayingAudio
} from "../actions/audio"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("AudioPlayer", () => {
  let helper, wrapper, dispatchThen

  const renderAudioPlayer = (props = {}, store) =>
    mount(
      <Provider store={store}>
        <AudioPlayer {...props} />
      </Provider>
    )
  const exampleAudio = {
    title:       "Test Title",
    description: "Test Description",
    url:
      "https://chtbl.com/track/F9DD6B/cdn.simplecast.com/audio/2c64ac/2c64ace6-baf4-4e86-b527-445e611e6a31/aa0ca88f-3c4c-4d33-9897-36e45c43e012/film-is-for-everyone-with-prof-david-thorburn_tc.mp3"
  }

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    wrapper = renderAudioPlayer({}, helper.store)
    dispatchThen = helper.store.createDispatchThen(state => state.audio)
    dispatchThen(setCurrentlyPlayingAudio(exampleAudio), [
      SET_CURRENTLY_PLAYING_AUDIO
    ])
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render the component", () => {
    assert.equal(wrapper.find(".audio-player-container-outer").length, 1)
  })

  it("should render all the necessary controls and fields", async () => {
    wrapper.update()
    assert.equal(wrapper.find(`[data-amplitude-song-info="album"]`).length, 1)
    assert.equal(wrapper.find(`[data-amplitude-song-info="name"]`).length, 1)
    assert.equal(wrapper.find(`.amplitude-play-pause`).length, 1)
    assert.equal(wrapper.find(`.amplitude-current-minutes`).length, 1)
    assert.equal(wrapper.find(`.amplitude-current-seconds`).length, 1)
    assert.equal(wrapper.find(`.amplitude-song-played-progress`).length, 1)
    assert.equal(wrapper.find(`.amplitude-duration-minutes`).length, 1)
    assert.equal(wrapper.find(`.amplitude-duration-seconds`).length, 1)
    assert.equal(wrapper.find(`.amplitude-playback-speed`).length, 1)
  })

  it("should properly set the episode info in amplitudejs", () => {
    assert.equal(Amplitude.getConfig().songs[0].album, exampleAudio.title)
    assert.equal(Amplitude.getConfig().songs[0].name, exampleAudio.description)
    assert.equal(Amplitude.getConfig().songs[0].url, exampleAudio.url)
  })
})
