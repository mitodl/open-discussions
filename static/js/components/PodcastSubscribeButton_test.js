// @flow
import { assert } from "chai"

import PodcastSubscribeButton from "./PodcastSubscribeButton"

import { makePodcast } from "../factories/podcasts"

import IntegrationTestHelper from "../util/integration_test_helper"

describe("PodcastSubscribeButton", () => {
  let podcast, helper, render

  beforeEach(() => {
    podcast = makePodcast()
    helper = new IntegrationTestHelper()
    render = helper.configureReduxQueryRenderer(PodcastSubscribeButton, {
      podcast
    })
  })

  afterEach(() => {
    helper.cleanup()
  })

  const assertLinks = wrapper => {
    const [google, apple] = wrapper.find("a")
    assert.equal(google.props.href, podcast.google_podcasts_url)
    assert.equal(apple.props.href, podcast.apple_podcasts_url)
  }

  it("should return null if no urls", async () => {
    podcast.google_podcasts_url = undefined
    podcast.apple_podcasts_url = undefined
    const { wrapper } = await render()
    assert.isTrue(wrapper.find("PodcastSubscribeButton").isEmptyRender())
  })

  it("should just say 'subscribe' initially", async () => {
    const { wrapper } = await render()
    assert.equal(wrapper.find("PodcastSubscribeButton").text(), "Subscribe")
  })

  it("should show URLs for the podcast when hovered", async () => {
    const { wrapper } = await render()
    wrapper.find("PodcastSubscribeButton").simulate("mouseEnter")
    assertLinks(wrapper)
  })

  // the 'click' version is for mobile support
  it("should show URLs for the podcast when clicked", async () => {
    const { wrapper } = await render()
    wrapper.find("PodcastSubscribeButton").simulate("mouseEnter")
    assertLinks(wrapper)
  })
})
