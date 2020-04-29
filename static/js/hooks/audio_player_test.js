// @flow
import React from "react"
import { assert } from "chai"
import Amplitude from "amplitudejs"

import IntegrationTestHelper from "../util/integration_test_helper"
import { currentlyPlayingAudioSelector } from "../lib/redux_selectors"
import { useInitAudioPlayer } from "./audio_player"

describe("audio player hooks", () => {
  let helper
  const exampleAudio = {
    title:       "Test Title",
    description: "Test Description",
    url:
      "https://chtbl.com/track/F9DD6B/cdn.simplecast.com/audio/2c64ac/2c64ace6-baf4-4e86-b527-445e611e6a31/aa0ca88f-3c4c-4d33-9897-36e45c43e012/film-is-for-everyone-with-prof-david-thorburn_tc.mp3"
  }

  beforeEach(() => {
    helper = new IntegrationTestHelper()
  })

  afterEach(() => {
    helper.cleanup()
  })

  describe("useInitAudioPlayer", () => {
    let render
    const TestComponent = () => {
      const initAudioPlayer = useInitAudioPlayer(exampleAudio)

      return <div id="testDiv" onClick={initAudioPlayer} />
    }

    beforeEach(() => {
      render = helper.configureReduxQueryRenderer(TestComponent)
    })

    it("starts playing upon click", async () => {
      const { wrapper } = await render()
      wrapper.find("#testDiv").simulate("click")
      assert.isTrue(Amplitude.getAudio()._playStub.calledOnce)
    })

    it("sets the example audio as the currently playing audio", async () => {
      const { wrapper, store } = await render()
      wrapper.find("#testDiv").simulate("click")
      const currentlyPlayingAudio = currentlyPlayingAudioSelector(
        store.getState()
      )
      assert.deepEqual(exampleAudio, currentlyPlayingAudio)
    })
  })
})
