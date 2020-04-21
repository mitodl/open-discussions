// @flow
/* global SETTINGS:false */
import { assert } from "chai"
import sinon from "sinon"

import { makePodcast, makePodcastEpisode } from "../factories/podcasts"
import { embedlyThumbnail } from "../lib/url"
import IntegrationTestHelper from "../util/integration_test_helper"
import PodcastEpisodeCard, {
  PODCAST_IMG_WIDTH,
  PODCAST_IMG_HEIGHT
} from "./PodcastEpisodeCard"
import * as podcastHooks from "../hooks/podcasts"

describe("PodcastEpisodeCard", () => {
  let podcast, episode, render, helper

  beforeEach(() => {
    podcast = makePodcast()
    episode = makePodcastEpisode(podcast)
    helper = new IntegrationTestHelper()
    render = helper.configureReduxQueryRenderer(PodcastEpisodeCard, {
      podcast,
      episode
    })
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render basic stuff", async () => {
    const { wrapper } = await render()
    assert.equal(wrapper.find("Dotdotdot").props().children, episode.title)
    assert.equal(wrapper.find(".podcast-name").text(), podcast.title)
    assert.equal(
      wrapper.find("img").prop("src"),
      embedlyThumbnail(
        SETTINGS.embedlyKey,
        episode.image_src,
        PODCAST_IMG_HEIGHT,
        PODCAST_IMG_WIDTH
      )
    )
  })

  it("should have a play button", async () => {
    const { wrapper } = await render()
    assert.ok(wrapper.find("PodcastPlayButton").exists())
    assert.deepEqual(wrapper.find("PodcastPlayButton").prop("episode"), episode)
  })

  it("should put a click handler on card to open drawer", async () => {
    const openStub = helper.sandbox.stub()
    helper.sandbox.stub(podcastHooks, "useOpenEpisodeDrawer").returns(openStub)
    const { wrapper } = await render()
    wrapper
      .find(".podcast-episode-card")
      .at(0)
      .simulate("click")
    sinon.assert.called(openStub)
  })
})
