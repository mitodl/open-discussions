// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"

import ExpandedLearningResourceDisplay from "../components/ExpandedLearningResourceDisplay"

import {
  makeCourse,
  makeLearningResource
} from "../factories/learning_resources"
import {
  LR_TYPE_COURSE,
  LR_TYPE_BOOTCAMP,
  LR_TYPE_PROGRAM,
  LR_TYPE_USERLIST
} from "../lib/constants"
import { bestRun, getInstructorName } from "../lib/learning_resources"
import { shouldIf } from "../lib/test_utils"
import { defaultResourceImageURL } from "../lib/url"
import { capitalize } from "../lib/util"

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
        runId={course.course_runs[0] ? course.course_runs[0].id : 0}
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

  it(`should render a default course image if none exists`, () => {
    course.image_src = null
    const wrapper = render()
    assert.ok(
      wrapper
        .find(".course-image-div")
        .find("img")
        .prop("src")
        .includes(encodeURIComponent(defaultResourceImageURL()))
    )
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
  ;[
    ["mitx", "september 01, 2019", "Start Date:"],
    ["ocw", "Fall 2019", "As Taught In:"]
  ].forEach(([platform, expectedValue, expectedLabel]) => {
    it(`should display the correct date label and options for ${platform} courses`, () => {
      course.platform = platform
      const courseRun = course.course_runs[0]
      courseRun.start_date = "2019-09-01T00:00:00Z"
      courseRun.semester = "Fall"
      courseRun.year = "2019"
      const wrapper = render()
      const selectOptions = wrapper.find("option")
      assert.equal(selectOptions.length, course.course_runs.length)
      assert.equal(selectOptions.at(0).text(), expectedValue)
      const dateLabel = wrapper
        .find(".form")
        .at(0)
        .find(".course-info-label")
        .text()
      assert.equal(dateLabel, expectedLabel)
    })
  })

  it("should display 'Ongoing' for a course with no good dates", () => {
    course.platform = "mitx"
    course.course_runs = course.course_runs.splice(0, 1)
    const courseRun = course.course_runs[0]
    courseRun.start_date = null
    courseRun.best_start_date = null
    const wrapper = render()
    const dateDiv = wrapper.find(".select-semester-div")
    assert.equal(dateDiv.text(), "Ongoing")
  })

  //
  ;[[1, false], [2, true]].forEach(([runs, showDropdown]) => {
    it(`${shouldIf(
      showDropdown
    )} display a course run dropdown for a course with ${runs} run(s)`, () => {
      course.course_runs = course.course_runs.slice(0, runs)
      const wrapper = render()
      assert.equal(wrapper.find("option").exists(), showDropdown)
    })
  })

  //
  ;[
    ["2019-09-01T00:00:00Z", "2019-08-01T00:00:00Z", "september 01, 2019"],
    [null, "2019-08-01T00:00:00Z", "august 01, 2019"],
    [null, null, "Ongoing"]
  ].forEach(([startDate, bestDate, expected]) => {
    it(`mitx run date should be ${expected} for start date ${String(
      startDate
    )}, best date ${String(bestDate)}`, () => {
      course.platform = "mitx"
      const courseRun = course.course_runs[0]
      courseRun.start_date = startDate
      courseRun.best_start_date = bestDate
      const wrapper = render()
      const dateValue = wrapper
        .find(".select-semester-div")
        .find("option")
        .at(0)
        .text()
      assert.equal(dateValue, expected)
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
      assert.ok(instructorText.includes(getInstructorName(instructor)))
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
  ;[LR_TYPE_COURSE, LR_TYPE_BOOTCAMP, LR_TYPE_PROGRAM].forEach(objectType => {
    it(`should display the platform in the link button text for ${objectType}`, () => {
      const object = makeLearningResource(objectType)
      // $FlowFixMe
      object.offered_by = "xPro"
      const wrapper = render({
        object,
        objectType
      })
      const linkText = wrapper.find(".link-button").text()
      assert.equal(
        linkText,
        objectType === LR_TYPE_BOOTCAMP
          ? "Take Bootcamp"
          : `Take ${capitalize(objectType)} on xPro`
      )
    })
  })

  //
  ;[LR_TYPE_COURSE, LR_TYPE_BOOTCAMP, LR_TYPE_PROGRAM].forEach(objectType => {
    it(`should display the cost for ${objectType}`, () => {
      const prices = [{ price: 25.5, mode: "" }]
      const object = makeLearningResource(objectType)
      if (objectType === LR_TYPE_PROGRAM) {
        object.prices = prices
      } else {
        // $FlowFixMe: bestRun result won't be null
        bestRun(object.course_runs).prices = prices
      }

      const wrapper = render({
        object,
        objectType
      })
      assert.equal(
        wrapper
          .find(".attach_money")
          .closest(".course-info-row")
          .find(".course-info-value")
          .text(),
        "$25.50"
      )
    })
  })

  it(`should display an item list, profile image & privacy but not language, cost or link button for Learning Paths`, () => {
    const objectType = LR_TYPE_USERLIST
    const object = makeLearningResource(objectType)
    const wrapper = render({ object, objectType })
    assert.equal(
      wrapper
        .find(".course-info-value")
        .last()
        .text(),
      capitalize(object.privacy_level)
    )
    assert.isOk(
      wrapper
        .find(".course-info-row.centered.bordered")
        .at(0)
        .text()
        .includes(object.items[0].content_data.title)
    )
    assert.isOk(wrapper.find(".profile-image").exists())
    assert.isNotOk(wrapper.find(".link-button").exists())
    assert.isNotOk(wrapper.find(".language").exists())
    assert.isNotOk(wrapper.find(".attach_money").exists())
  })

  it(`should still display without errors in case of a bad course with no runs`, () => {
    course.course_runs = []
    const wrapper = render()
    assert.isNotOk(
      wrapper
        .find(".bar_chart")
        .at(0)
        .exists()
    )
    assert.isNotOk(
      wrapper
        .find(".school")
        .at(1)
        .exists()
    )
    assert.equal(
      wrapper
        .find(".language")
        .closest(".course-info-row")
        .find(".course-info-value")
        .text(),
      "English"
    )
  })
})
