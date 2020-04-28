import { assert } from "chai"

import AudioPlayer from "./AudioPlayer"
import { setAudioPlayerState, setCurrentlyPlayingAudio } from "../actions/audio"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("AudioPlayer", () => {
  let helper, render

  const exampleAudio = {
    title:       "Test Title",
    description: "Test Description",
    url:
      "https://chtbl.com/track/F9DD6B/cdn.simplecast.com/audio/2c64ac/2c64ace6-baf4-4e86-b527-445e611e6a31/aa0ca88f-3c4c-4d33-9897-36e45c43e012/film-is-for-everyone-with-prof-david-thorburn_tc.mp3"
  }

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    render = helper.configureReduxQueryRenderer(AudioPlayer)
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should be hidden if we try and render it without setting audio", async () => {
    const { wrapper } = await render({}, [])
    assert.isTrue(
      wrapper.find(".audio-player-container-outer").hasClass("hidden")
    )
  })

  it("should render the component and be visible if audio is passed in", async () => {
    const { wrapper } = await render({}, [
      setCurrentlyPlayingAudio(exampleAudio)
    ])
    assert.equal(wrapper.find(`.audio-player-container-outer`).length, 1)
    assert.isFalse(
      wrapper.find(".audio-player-container-outer").hasClass("hidden")
    )
  })

  it("should render all the necessary controls and fields", async () => {
    const { wrapper } = await render({}, [
      setCurrentlyPlayingAudio(exampleAudio)
    ])
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

  it("should render a pause icon when the player state is playing", async () => {
    const { wrapper } = await render({}, [
      setCurrentlyPlayingAudio(exampleAudio),
      setAudioPlayerState("playing")
    ])
    assert.equal(
      wrapper.find(`.amplitude-play-pause span`).text(),
      "pause_circle_outline"
    )
  })

  it("should render a play icon when the player state is paused", async () => {
    const { wrapper } = await render({}, [
      setCurrentlyPlayingAudio(exampleAudio),
      setAudioPlayerState("paused")
    ])
    assert.equal(
      wrapper.find(`.amplitude-play-pause span`).text(),
      "play_circle_outline"
    )
  })
})
