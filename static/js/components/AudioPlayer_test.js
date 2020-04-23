import { assert } from "chai"
import Amplitude from "amplitudejs"

import AudioPlayer from "./AudioPlayer"
import { setCurrentlyPlayingAudio } from "../actions/audio"
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

  it("should render the component", async () => {
    const { wrapper } = await render({}, [
      setCurrentlyPlayingAudio(exampleAudio)
    ])
    assert.equal(wrapper.find(".audio-player-container-outer").length, 1)
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

  it("should properly set the episode info in amplitudejs", async () => {
    const { wrapper } = await render({}, [
      setCurrentlyPlayingAudio(exampleAudio)
    ])
    assert.equal(Amplitude.getConfig().songs[0].album, exampleAudio.title)
    assert.equal(Amplitude.getConfig().songs[0].name, exampleAudio.description)
    assert.equal(Amplitude.getConfig().songs[0].url, exampleAudio.url)
  })
})
