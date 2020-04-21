// @flow
import { assert } from "chai"
import R from "ramda"

import PodcastFrontpage from "./PodcastFrontpage"

import IntegrationTestHelper from "../util/integration_test_helper"

import { genericQueryResponse, queryListResponse } from "../lib/test_utils"
import { podcastApiURL, recentPodcastApiURL } from "../lib/url"
import { makePodcast, makePodcastEpisode } from "../factories/podcasts"

describe("PodcastFrontpage tests", () => {
  let helper, render, podcasts, episodes

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
})
