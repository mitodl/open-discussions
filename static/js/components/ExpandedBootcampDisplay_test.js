// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"

import ExpandedBootcampDisplay from "../components/ExpandedBootcampDisplay"

import { makeBootcamp } from "../factories/courses"

describe("ExpandedBootcampDisplay", () => {
  let bootcamp

  beforeEach(() => {
    bootcamp = makeBootcamp()
  })

  const render = () => shallow(<ExpandedBootcampDisplay bootcamp={bootcamp} />)

  it(`should render a course image`, () => {
    const wrapper = render()
    assert.ok(
      wrapper
        .find(".course-image-div")
        .find("img")
        .prop("src")
        .includes("https://i.embed.ly/1/display/crop")
    )
    assert.ok(
      wrapper
        .find(".course-image-div")
        .find("img")
        .prop("src")
        // $FlowFixMe: this won't be null
        .includes(encodeURIComponent(bootcamp.image_src))
    )
  })

  it(`should not render a course image if none exists`, () => {
    bootcamp.image_src = null
    const wrapper = render()
    assert.isNotOk(wrapper.find(".course-image-div").exists())
  })

  it("should render course links", () => {
    const wrapper = render()
    const link = wrapper.find(".course-links").find("a")
    assert.equal(link.prop("href"), bootcamp.url)
  })

  it("should render course description as a ClampLines tag", () => {
    const wrapper = render()
    const clampLines = wrapper.find("ClampLines")
    assert.equal(clampLines.props().text, bootcamp.short_description)
  })

  it("should not render course links if url is null", () => {
    bootcamp.url = null
    const wrapper = render()
    assert.isNotOk(wrapper.find(".course-links").exists())
  })

  it("should display all topics for the course", () => {
    const wrapper = render()
    const topicDivs = wrapper.find(".course-topics").find(".grey-surround")
    assert.equal(topicDivs.length, bootcamp.topics.length)
    assert.deepEqual(
      topicDivs.map(topicDiv => ({ name: topicDiv.text() })),
      bootcamp.topics
    )
  })

  it("should display all instructors for the course", () => {
    const wrapper = render()
    const instructorText = wrapper
      .find(".school")
      .closest(".course-info-row")
      .find(".course-info-value")
      .text()
    bootcamp.instructors.forEach(instructor => {
      assert.ok(
        instructorText.includes(
          `${instructor.first_name} ${instructor.last_name}`
        )
      )
    })
  })

  //
  ;[
    ["en-us", "English"],
    ["fr", "French"],
    ["zh-CN", "Chinese"],
    [null, "English"],
    ["", "English"]
  ].forEach(([langCode, langName]) => {
    it(`should display the correct language name for ${String(
      langCode
    )}`, () => {
      bootcamp.language = langCode
      const wrapper = render()
      assert.equal(
        wrapper
          .find(".language")
          .closest(".course-info-row")
          .find(".course-info-value")
          .text(),
        langName
      )
    })
  })
})
