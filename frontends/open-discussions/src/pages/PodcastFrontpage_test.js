// @flow
import { assert } from "chai"
import R from "ramda"
import sinon from "sinon"

import PodcastFrontpage from "./PodcastFrontpage"

import IntegrationTestHelper from "../util/integration_test_helper"

import {
  genericQueryResponse,
  isIf,
  queryListResponse,
  shouldIf
} from "../lib/test_utils"
import { podcastApiURL, recentPodcastApiURL } from "../lib/url"
import { makePodcast, makePodcastEpisode } from "../factories/podcasts"
import * as lrHooks from "../hooks/learning_resources"

describe("PodcastFrontpage tests", () => {
  let helper, render, podcasts, episodes, hookStub

  beforeEach(() => {
    podcasts = R.times(makePodcast, 10)
    episodes = podcasts.map(makePodcastEpisode)

    helper = new IntegrationTestHelper()
    helper.handleRequestStub
      .withArgs(podcastApiURL.toString())
      .returns(genericQueryResponse(podcasts))
    helper.handleRequestStub
      .withArgs(recentPodcastApiURL.toString())
      .returns(queryListResponse(episodes))
    render = helper.configureReduxQueryRenderer(PodcastFrontpage)
    hookStub = helper.sandbox.stub(lrHooks, "useLearningResourcePermalink")
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render recent episodes", async () => {
    const { wrapper } = await render()

    R.zip(
      episodes.slice(0, 6),
      wrapper.find("PodcastEpisodeCard").map(card => card.prop("episode"))
    ).map(episodes => assert.deepEqual(...episodes))
  })

  it("should render podcasts", async () => {
    const { wrapper } = await render()

    R.zip(
      podcasts,
      wrapper.find("PodcastCard").map(card => card.prop("podcast"))
    ).map(podcasts => assert.deepEqual(...podcasts))
  })

  describe("loader", () => {
    [
      [true, true, true, true],
      [true, false, true, true],
      [false, true, false, true],
      [false, false, false, false]
    ].forEach(
      ([
        podcastLoading,
        episodesLoading,
        expectedPodcastSpinner,
        expectedRecentEpisodesSpinner
      ]) => {
        it(`${shouldIf(
          expectedPodcastSpinner
        )} show a spinner for podcasts and ${shouldIf(
          expectedRecentEpisodesSpinner
        )} show a spinner for recent episodes, if podcasts ${isIf(
          podcastLoading
        )} loading and recent episodes ${isIf(
          episodesLoading
        )} loading`, async () => {
          helper.isLoadingStub
            .withArgs(podcastApiURL.toString())
            .returns(podcastLoading)
          helper.isLoadingStub
            .withArgs(recentPodcastApiURL.toString())
            .returns(episodesLoading)

          const { wrapper } = await render()
          assert.equal(
            expectedRecentEpisodesSpinner,
            wrapper.find("PodcastEpisodeLoading").exists()
          )
          assert.equal(
            expectedPodcastSpinner,
            wrapper.find("PodcastLoading").exists()
          )
        })
      }
    )
  })

  it("should call hook for drawer sharing", async () => {
    await render()
    sinon.assert.called(hookStub)
  })
})
