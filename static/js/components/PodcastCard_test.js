// @flow
/* global SETTINGS:false */
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"

import PodcastCard, { PODCAST_IMG_HEIGHT } from "./PodcastCard"

import { makePodcast } from "../factories/podcasts"
import { embedlyThumbnail } from "../lib/url"
import { CAROUSEL_IMG_WIDTH } from "../lib/constants"

describe("PodcastCard", () => {
  let podcast

  beforeEach(() => {
    podcast = makePodcast()
  })

  const render = (props = {}) =>
    shallow(<PodcastCard podcast={podcast} {...props} />)

  it("should render basic stuff", () => {
    const wrapper = render()
    assert.equal(wrapper.find("Dotdotdot").props().children, podcast.title)
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
})
