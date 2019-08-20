// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import moment from "moment"

import ExpandedLearningResourceDisplay from "../components/ExpandedLearningResourceDisplay"

import {
  makeBootcamp,
  makeCourse,
  makeLearningResource
} from "../factories/learning_resources"
import { LR_TYPE_COURSE, LR_TYPE_BOOTCAMP } from "../lib/constants"

describe("ExpandedLearningResourceDisplay", () => {
  let course

  beforeEach(() => {
    course = makeCourse()
  })

  const render = ({ ...props }) =>
    shallow(
      <ExpandedLearningResourceDisplay
        object={course}
        objectType={LR_TYPE_COURSE}
        {...props}
      />
    )

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
        .includes(encodeURIComponent(course.image_src))
    )
  })

  it(`should not render a course image if none exists`, () => {
    course.image_src = null
    const wrapper = render()
    assert.isNotOk(wrapper.find(".course-image-div").exists())
  })

  it("should render course links", () => {
    const wrapper = render()
    const link = wrapper.find(".course-links").find("a")
    assert.equal(link.prop("href"), course.url)
  })

  it("should render course description as a ClampLines tag", () => {
    const wrapper = render()
    const clampLines = wrapper.find("ClampLines")
    assert.equal(clampLines.props().text, course.short_description)
  })

  it("should not render course links if url is null", () => {
    course.url = null
    const wrapper = render()
    assert.isNotOk(wrapper.find(".course-links").exists())
  })

  it("should display all topics for the course", () => {
    const wrapper = render()
    const topicDivs = wrapper.find(".course-topics").find(".grey-surround")
    assert.equal(topicDivs.length, course.topics.length)
    assert.deepEqual(
      topicDivs.map(topicDiv => ({ name: topicDiv.text() })),
      course.topics
    )
  })

  //
  ;[["mitx", "As taught in:"], ["ocw", "Semester:"]].forEach(
    ([platform, label]) => {
      it(`should display the correct semester label for ${platform} courses`, () => {
        course.platform = platform
        const wrapper = render()
        const dateLabel = wrapper
          .find(".history")
          .closest(".course-info-row")
          .find(".course-info-label")
          .text()
        assert.equal(dateLabel, label)
      })
    }
  )

  //
  ;["mitx", "ocw"].forEach(platform => {
    it(`should display the correct start date for ${platform} courses`, () => {
      course.platform = platform
      const wrapper = render()
      const dateValue = wrapper
        .find(".calendar_today")
        .closest(".course-info-row")
        .find(".course-info-value")
        .text()
      assert.equal(
        dateValue,
        course.platform === "ocw"
          ? "Ongoing"
          : moment(course.course_runs[0].start_date).format("DD MMMM YYYY")
      )
    })
  })

  it("should display all instructors for the course", () => {
    const wrapper = render()
    const instructorText = wrapper
      .find(".school")
      .closest(".course-info-row")
      .find(".course-info-value")
      .text()
    course.course_runs[0].instructors.forEach(instructor => {
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
      course.course_runs[0].language = langCode
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

  it(`should display year and not semester for bootcamps`, () => {
    const bootcamp = makeBootcamp()
    const wrapper = render({ object: bootcamp, objectType: LR_TYPE_BOOTCAMP })
    const historyValue = wrapper
      .find(".history")
      .closest(".course-info-row")
      .find(".course-info-value")
      .text()
    const historyLabel = wrapper
      .find(".history")
      .closest(".course-info-row")
      .find(".course-info-label")
      .text()
    assert.equal(historyValue, bootcamp.course_runs[0].year)
    assert.equal(historyLabel, "As taught in:")
  })

  //
  ;[LR_TYPE_COURSE, LR_TYPE_BOOTCAMP].forEach(objectType => {
    it(`should display the platform in the link button text for ${objectType}`, () => {
      const object = makeLearningResource(objectType)
      const wrapper = render({
        object,
        objectType
      })
      const linkText = wrapper.find(".link-button").text()
      assert.equal(
        linkText,
        objectType === LR_TYPE_COURSE
          ? // $FlowFixMe: only courses will access platform
          `Take Course on ${object.platform.toUpperCase()}`
          : "Take Bootcamp"
      )
    })
  })
})
