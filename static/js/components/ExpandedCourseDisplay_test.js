// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import moment from "moment"

import ExpandedCourseDisplay from "../components/ExpandedCourseDisplay"

import { makeCourse } from "../factories/courses"

describe("ExpandedCourseDisplay", () => {
  let course

  beforeEach(() => {
    course = makeCourse()
  })

  const render = () => shallow(<ExpandedCourseDisplay course={course} />)

  it(`should render a course image`, () => {
    const wrapper = render()
    assert.ok(
      wrapper
        .find(".course-image")
        .prop("src")
        .includes("https://i.embed.ly/1/display/resize")
    )
    assert.ok(
      wrapper
        .find(".course-image")
        .prop("src")
        // $FlowFixMe: this won't be null
        .includes(encodeURIComponent(course.image_src))
    )
  })

  it(`should not render a course image if none exists`, () => {
    course.image_src = null
    const wrapper = render()
    assert.isNotOk(wrapper.find(".course-image").exists())
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
          : moment(course.start_date).format("DD MMMM YYYY")
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
    course.instructors.forEach(instructor => {
      assert.ok(
        instructorText.includes(
          `${instructor.first_name} ${instructor.last_name}`
        )
      )
    })
  })
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
      course.language = langCode
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
