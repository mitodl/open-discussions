// @flow
import { assert } from "chai"

import { hookClickTestHarness } from "./test_util"
import IntegrationTestHelper from "../util/integration_test_helper"
import { makePodcast, makePodcastEpisode } from "../factories/podcasts"
import { useOpenPodcastDrawer, useOpenEpisodeDrawer } from "./podcasts"
import { LR_TYPE_PODCAST, LR_TYPE_PODCAST_EPISODE } from "../lib/constants"

const OpenPodcastComponent = hookClickTestHarness(useOpenPodcastDrawer)
const OpenEpisodeComponent = hookClickTestHarness(useOpenEpisodeDrawer)

describe("Podcast hooks", () => {
  let helper, render

  beforeEach(() => {
    helper = new IntegrationTestHelper()
  })

  afterEach(() => {
    helper.cleanup()
  })

  describe("Podcast drawer hook", () => {
    let podcast
    beforeEach(() => {
      podcast = makePodcast()
      render = helper.configureReduxQueryRenderer(OpenPodcastComponent, {
        hookArgs: podcast.id
      })
    })

    it("should dispatch the action we expect to the store", async () => {
      const { wrapper, store } = await render()
      wrapper.find(OpenPodcastComponent).simulate("click")

      assert.deepEqual(store.getState().ui.LRDrawerHistory[0], {
        objectId:   podcast.id,
        objectType: LR_TYPE_PODCAST,
        runId:      undefined
      })
    })
  })

  describe("Episode drawer hook", () => {
    let episode

    beforeEach(() => {
      episode = makePodcastEpisode()
      render = helper.configureReduxQueryRenderer(OpenEpisodeComponent, {
        hookArgs: episode.id
      })
    })

    it("should dispatch the action we expect to the store", async () => {
      const { wrapper, store } = await render()
      wrapper.find(OpenEpisodeComponent).simulate("click")

      assert.deepEqual(store.getState().ui.LRDrawerHistory[0], {
        objectId:   episode.id,
        objectType: LR_TYPE_PODCAST_EPISODE,
        runId:      undefined
      })
    })
  })
})
