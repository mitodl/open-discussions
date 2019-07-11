// @flow
/* global SETTINGS:false */
import R from "ramda"
import { assert } from "chai"
import sinon from "sinon"

import BootcampCard from "./BootcampCard"

import { availabilityLabel, minPrice } from "../lib/courses"
import { configureShallowRenderer } from "../lib/test_utils"
import {makeBootcamp} from "../factories/courses"
import {
  CAROUSEL_IMG_WIDTH,
  CAROUSEL_IMG_HEIGHT,
} from "../lib/constants"
import { embedlyThumbnail } from "../lib/url"

describe("BootcampCard", () => {
  let renderBootcampCard, bootcamps, bootcamp, sandbox, setShowLearningResourceDrawerStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    bootcamps = R.times(makeBootcamp, 10)
    setShowLearningResourceDrawerStub = sandbox.stub()
    bootcamp = bootcamps[0]
    renderBootcampCard = configureShallowRenderer(BootcampCard, {
      bootcamp,
      setShowLearningResourceDrawer: setShowLearningResourceDrawerStub
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should set an onClick handler with the setShowLearningResourceDrawer function", () => {
    const wrapper = renderBootcampCard()
    wrapper.find(".cover-image").simulate("click")
    wrapper.find(".course-title").simulate("click")
    sinon.assert.calledTwice(setShowLearningResourceDrawerStub)
  })

  it("should set a click handler on the topics, if passed a function", () => {
    const setTopicStub = sandbox.stub()
    const wrapper = renderBootcampCard({
      toggleFacet: setTopicStub
    })
    wrapper
      .find(".topic")
      .at(0)
      .simulate("click")
    sinon.assert.calledWith(setTopicStub, "topics", bootcamp.topics[0].name, true)
  })

  it("should render the image", () => {
    const coverImage = renderBootcampCard()
      .find(".cover-image")
      .find("img")
    assert.equal(
      coverImage.prop("src"),
      embedlyThumbnail(
        SETTINGS.embedlyKey,
        bootcamp.image_src,
        CAROUSEL_IMG_HEIGHT,
        CAROUSEL_IMG_WIDTH
      )
    )
    assert.equal(coverImage.prop("alt"), `cover image for ${course.title}`)
  })

  it("should render the title", () => {
    assert.equal(
      renderBootcampCard()
        .find("Dotdotdot")
        .props().children,
      bootcamp.title
    )
  })

  it("should render the topic", () => {
    assert.equal(
      renderBootcampCard()
        .find(".topics")
        .find(".topic")
        .at(0)
        .text(),
      bootcamp.topics[0].name
    )
  })

  it("should render availability", () => {
    assert.equal(
      renderBootcampCard()
        .find(".availability")
        .text(),
      availabilityLabel(bootcamp.availability)
    )
  })

  it("should render price", () => {
    assert.equal(
      renderBootcampCard()
        .find(".price")
        .text(),
      minPrice(bootcamp)
    )
  })
})
