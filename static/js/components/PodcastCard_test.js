// @flow
/* global SETTINGS:false */
import { assert } from "chai"
import sinon from "sinon"

import PodcastCard, { PODCAST_IMG_HEIGHT } from "./PodcastCard"

import { makePodcast } from "../factories/podcasts"
import { embedlyThumbnail } from "../lib/url"
import { CAROUSEL_IMG_WIDTH } from "../lib/constants"
import IntegrationTestHelper from "../util/integration_test_helper"
import * as podcastHooks from "../hooks/podcasts"

describe("PodcastCard", () => {
  let podcast, helper, render

  beforeEach(() => {
    podcast = makePodcast()
    helper = new IntegrationTestHelper()
    render = helper.configureReduxQueryRenderer(PodcastCard, { podcast })
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render basic stuff", async () => {
    const { wrapper } = await render()
    assert.equal(
      wrapper
        .find("Dotdotdot")
        .at(0)
        .props().children,
      podcast.title
    )
    assert.equal(
      wrapper
        .find("Dotdotdot")
        .at(1)
        .props().children,
      podcast.offered_by
    )
    assert.equal(
      wrapper.find(".podcast-episode-count").text(),
      `${podcast.episode_count} Episodes`
    )
    assert.equal(
      wrapper.find("img").prop("src"),
      embedlyThumbnail(
        SETTINGS.embedlyKey,
        podcast.image_src,
        PODCAST_IMG_HEIGHT,
        CAROUSEL_IMG_WIDTH
      )
    )
  })

  it("should put a click handler on the card to open drawer", async () => {
    const openStub = helper.sandbox.stub()
    helper.sandbox.stub(podcastHooks, "useOpenPodcastDrawer").returns(openStub)
    const { wrapper } = await render()
    wrapper.find("#podcast-card-inner-container").simulate("click")
    sinon.assert.called(openStub)
  })
})
