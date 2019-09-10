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
import { bestRun } from "../lib/learning_resources"

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
        runId={course.course_runs[0].id}
        setShowResourceDrawer={null}
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

  //
  ;[true, false].forEach(hasCourseRunUrl => {
    it(`should render course ${hasCourseRunUrl ? "run" : ""} link`, () => {
      const run = bestRun(course.course_runs)
      if (run && !hasCourseRunUrl) {
        run.url = null
      }
      const wrapper = render()
      const link = wrapper.find(".course-links").find("a")
      // $FlowFixMe: run won't be null
      assert.equal(link.prop("href"), hasCourseRunUrl ? run.url : course.url)
    })
  })

  it("should render course description as a ClampLines tag", () => {
    const wrapper = render()
    const clampLines = wrapper.find("ClampLines")
    assert.equal(clampLines.props().text, course.short_description)
  })

  it("should not render course links if urls are all null", () => {
    course.url = null
    course.course_runs.forEach(run => (run.url = null))
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
  ;[["mitx", "01 september 2019"], ["ocw", "Fall 2019"]].forEach(
    ([platform, expected]) => {
      it(`should display the correct 'As Taught In' label and options for ${platform} courses`, () => {
        course.platform = platform
        const courseRun = course.course_runs[0]
        courseRun.start_date = "2019-09-01T00:00:00Z"
        courseRun.semester = "Fall"
        courseRun.year = "2019"
        const wrapper = render()
        const selectOptions = wrapper.find("option")
        assert.equal(selectOptions.length, course.course_runs.length)
        assert.equal(selectOptions.at(0).text(), expected)
      })
    }
  )

  it(`should not display 'As Taught In' row for bootcamps`, () => {
    const bootcamp = makeBootcamp()
    const wrapper = render({ object: bootcamp, objectType: LR_TYPE_BOOTCAMP })
    assert.isNotOk(wrapper.find(".form").exists())
  })

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
          : // $FlowFixMe: run won't be null
          moment(bestRun(course.course_runs).start_date).format(
            "DD MMMM YYYY"
          )
      )
    })
  })

  it("should display all instructors for the course", () => {
    const wrapper = render()
    const instructorText = wrapper
      .find(".school")
      .at(1)
      .closest(".course-info-row")
      .find(".course-info-value")
      .text()
    // $FlowFixMe: course run won't be null here
    bestRun(course.course_runs).instructors.forEach(instructor => {
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
      // $FlowFixMe: course run won't be null here
      bestRun(course.course_runs).language = langCode
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
