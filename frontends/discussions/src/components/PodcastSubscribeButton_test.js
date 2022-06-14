// @flow
import { assert } from "chai"

import PodcastSubscribeButton from "./PodcastSubscribeButton"

import IntegrationTestHelper from "../util/integration_test_helper"

describe("PodcastSubscribeButton", () => {
  let rssUrl, appleUrl, googleUrl, buttonText, helper, render

  beforeEach(() => {
    rssUrl = "rss url"
    appleUrl = "apple url"
    googleUrl = "google url"
    buttonText = "text"

    helper = new IntegrationTestHelper()
    render = helper.configureReduxQueryRenderer(PodcastSubscribeButton, {
      rssUrl:     rssUrl,
      appleUrl:   appleUrl,
      googleUrl:  googleUrl,
      buttonText: buttonText
    })
  })

  afterEach(() => {
    helper.cleanup()
  })

  const assertLinks = wrapper => {
    const [google, apple, rss] = wrapper.find("a")
    assert.equal(google.props.href, googleUrl)
    assert.equal(apple.props.href, appleUrl)
    assert.equal(rss.props.href, rssUrl)
  }

  it("should show the button text initially", async () => {
    const { wrapper } = await render()
    assert.equal(wrapper.find("PodcastSubscribeButton").text(), buttonText)
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
