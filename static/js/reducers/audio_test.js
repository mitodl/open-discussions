// @flow
import { assert } from "chai"

import IntegrationTestHelper from "../util/integration_test_helper"
import { getCurrentlyPlayingAudio } from "../lib/redux_selectors"
import { INITIAL_AUDIO_STATE } from "./audio"
import {
  SET_CURRENTLY_PLAYING_AUDIO,
  setCurrentlyPlayingAudio
} from "../actions/audio"

describe("audio reducer", () => {
  let helper, store, dispatchThen

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    store = helper.store
    console.log(store)
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
      url:
        "https://file-examples.com/wp-content/uploads/2017/11/file_example_MP3_700KB.mp3"
    }
    dispatchThen(setCurrentlyPlayingAudio(exampleAudio), [
      SET_CURRENTLY_PLAYING_AUDIO
    ])
    const currentlyPlaying = getCurrentlyPlayingAudio(store.getState())
    assert.deepEqual(exampleAudio, currentlyPlaying)
  })
})
