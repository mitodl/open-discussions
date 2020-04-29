// @flow
import { assert } from "chai"

import IntegrationTestHelper from "../util/integration_test_helper"
import {
  audioPlayerStateSelector,
  currentlyPlayingAudioSelector
} from "../lib/redux_selectors"
import { INITIAL_AUDIO_STATE } from "./audio"
import {
  SET_AUDIO_PLAYER_STATE,
  setAudioPlayerState,
  SET_CURRENTLY_PLAYING_AUDIO,
  setCurrentlyPlayingAudio
} from "../actions/audio"

describe("audio reducer", () => {
  let helper, store, dispatchThen
  const testUrl =
    "https://chtbl.com/track/F9DD6B/cdn.simplecast.com/audio/2c64ac/2c64ace6-baf4-4e86-b527-445e611e6a31/aa0ca88f-3c4c-4d33-9897-36e45c43e012/film-is-for-everyone-with-prof-david-thorburn_tc.mp3"

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    store = helper.store
    dispatchThen = store.createDispatchThen(state => state.audio)
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should have some default state", () => {
    assert.deepEqual(store.getState().audio, INITIAL_AUDIO_STATE)
  })

  it("should let you set the currently playing audio", async () => {
    const exampleAudio = {
      title:       "Test Title",
      description: "Test Description",
      url:         testUrl
    }
    dispatchThen(setCurrentlyPlayingAudio(exampleAudio), [
      SET_CURRENTLY_PLAYING_AUDIO
    ])
    const currentlyPlaying = currentlyPlayingAudioSelector(store.getState())
    assert.deepEqual(exampleAudio, currentlyPlaying)
  })

  it("should let you set the audio player state", () => {
    dispatchThen(setAudioPlayerState("playing"), [SET_AUDIO_PLAYER_STATE])
    const audioPlayerState = audioPlayerStateSelector(store.getState())
    assert.equal("playing", audioPlayerState)
  })
})
