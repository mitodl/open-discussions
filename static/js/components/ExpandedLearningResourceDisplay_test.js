// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import R from "ramda"

import ExpandedLearningResourceDisplay from "../components/ExpandedLearningResourceDisplay"

import {
  makeCourse,
  makeLearningResource
} from "../factories/learning_resources"
import { makeYoutubeVideo } from "../factories/embedly"
import {
  LR_TYPE_COURSE,
  LR_TYPE_BOOTCAMP,
  LR_TYPE_PROGRAM,
  LR_TYPE_VIDEO,
  LR_TYPE_USERLIST,
  LR_TYPE_LEARNINGPATH
} from "../lib/constants"
import { bestRun, getInstructorName } from "../lib/learning_resources"
import { shouldIf } from "../lib/test_utils"
import { defaultResourceImageURL } from "../lib/url"
import { capitalize } from "../lib/util"

describe("ExpandedLearningResourceDisplay", () => {
  let course, embedly

  beforeEach(() => {
    course = makeCourse()
    embedly = makeYoutubeVideo()
  })

  const render = ({ ...props }) =>
    shallow(
      <ExpandedLearningResourceDisplay
        object={course}
        runId={course.runs[0] ? course.runs[0].id : 0}
        setShowResourceDrawer={null}
        embedly={embedly}
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
  ;[LR_TYPE_COURSE, LR_TYPE_PROGRAM].forEach(objectType => {
    [true, false].forEach(hasRunUrl => {
      it(`should render ${hasRunUrl ? "run" : objectType} link`, () => {
        const object = makeLearningResource(objectType)
        const run = bestRun(object.runs)
        if (!hasRunUrl) {
          // $FlowFixMe: run is not null here
          run.url = null
        }
        const wrapper = render({
          object,
          // $FlowFixMe: course run won't be null here
          runId: run.id
        })
        const link = wrapper.find(".course-links").find("a")
        // $FlowFixMe: run won't be null
        assert.equal(link.prop("href"), hasRunUrl ? run.url : object.url)
      })
    })
  })

  //
  ;[true, false].forEach(hasProgramUrl => {
    it(`${shouldIf(hasProgramUrl)} render program link`, () => {
      const program = makeLearningResource(LR_TYPE_PROGRAM)
      program.runs[0].url = null
      if (!hasProgramUrl) {
        program.url = null
      }
      const wrapper = render({
        object: program
      })
      const link = wrapper.find(".course-links").find("a")
      assert.equal(link.exists(), hasProgramUrl)
      if (hasProgramUrl) {
        assert.equal(link.prop("href"), program.url)
      }
    })
  })

  //
  ;[
    LR_TYPE_COURSE,
    LR_TYPE_BOOTCAMP,
    LR_TYPE_PROGRAM,
    LR_TYPE_USERLIST,
    LR_TYPE_LEARNINGPATH
  ].forEach(objectType => {
    it(`should render description using the TruncatedText for ${objectType}`, () => {
      const object = makeLearningResource(objectType)
      const wrapper = render({ object })
      const truncated = wrapper.find("TruncatedText")
      assert.equal(truncated.props().text, object.short_description)
    })

    it(`should render a title for ${objectType}`, () => {
      const object = makeLearningResource(objectType)
      const wrapper = render({ object })
      assert.equal(wrapper.find(".course-title").text(), object.title)
    })
  })

  it("should not render course links if urls are all null", () => {
    course.url = null
    course.runs.forEach(run => (run.url = null))
    const wrapper = render()
    assert.isNotOk(wrapper.find(".course-links").exists())
  })

  //
  ;[LR_TYPE_COURSE, LR_TYPE_BOOTCAMP, LR_TYPE_PROGRAM].forEach(objectType => {
    it(`should display all topics for the ${objectType}`, () => {
      const object = makeLearningResource(objectType)
      // $FlowFixMe
      object.offered_by = ["xPro"]
      const wrapper = render({
        object
      })
      const topicDivs = wrapper.find(".course-topics").find(".grey-surround")
      assert.equal(topicDivs.length, object.topics.length)
      assert.deepEqual(
        topicDivs.map(topicDiv => topicDiv.text()).sort(),
        object.topics.map(topic => topic.name).sort()
      )
    })
  })

  //
  ;[
    ["mitx", "september 01, 2019", "Start Date:"],
    ["ocw", "Fall 2019", "As Taught In:"]
  ].forEach(([platform, expectedValue, expectedLabel]) => {
    it(`should display the correct date label and options for ${platform} courses`, () => {
      course.platform = platform
      const courseRun = course.runs[0]
      courseRun.start_date = "2019-09-01T00:00:00Z"
      courseRun.semester = "Fall"
      courseRun.year = "2019"
      const wrapper = render()
      const selectOptions = wrapper.find("option")
      assert.equal(selectOptions.length, course.runs.length)
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
    course.runs = course.runs.splice(0, 1)
    const courseRun = course.runs[0]
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
      course.runs = course.runs.slice(0, runs)
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
      const courseRun = course.runs[0]
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

  //
  ;[LR_TYPE_PROGRAM, LR_TYPE_COURSE, LR_TYPE_BOOTCAMP].forEach(objectType => {
    it(`should display all instructors for the ${objectType}`, () => {
      const object = makeLearningResource(objectType)
      const wrapper = render({
        object,
        // $FlowFixMe: course run won't be null here
        runId: bestRun(object.runs).id
      })
      const instructorText = wrapper
        .find(".school")
        .at(1)
        .closest(".course-info-row")
        .find(".course-info-value")
        .text()
      // $FlowFixMe: course run won't be null here
      bestRun(object.runs).instructors.forEach(instructor => {
        assert.ok(instructorText.includes(getInstructorName(instructor)))
      })
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
      bestRun(course.runs).language = langCode
      // $FlowFixMe: course run won't be null here
      const wrapper = render({ runId: bestRun(course.runs).id })
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
      object.offered_by = ["xPro"]
      const wrapper = render({
        object
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
      let run
      if (objectType === LR_TYPE_PROGRAM) {
        object.runs[0].prices = prices
        run = object.runs[0]
      } else {
        // $FlowFixMe: bestRun result won't be null
        bestRun(object.runs).prices = prices
        run = bestRun(object.runs)
      }

      const wrapper = render({
        object,
        // $FlowFixMe
        runId: run.id
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

  //
  ;[LR_TYPE_USERLIST, LR_TYPE_LEARNINGPATH].forEach(objectType => {
    it(`should display the authors name for ${objectType}`, () => {
      const object = makeLearningResource(objectType)
      const wrapper = render({
        object
      })
      assert.equal(
        wrapper
          .find(".local_offer")
          .closest(".course-info-row")
          .find(".course-info-value")
          .text(),
        object.author_name
      )
    })

    it(`should display the privacy for ${objectType}`, () => {
      const object = makeLearningResource(objectType)
      const wrapper = render({
        object
      })
      assert.equal(
        wrapper
          .find(".lock")
          .closest(".course-info-row")
          .find(".course-info-value")
          .text(),
        capitalize(object.privacy_level)
      )
    })

    it(`should display the length for ${objectType}`, () => {
      const object = makeLearningResource(objectType)
      const wrapper = render({
        object
      })
      assert.equal(
        wrapper
          .find(".view_list")
          .closest(".course-info-row")
          .find(".course-info-value")
          .text(),
        object.items.length
      )
    })

    it(`should include a display of list items for ${objectType}`, () => {
      const object = makeLearningResource(objectType)
      const wrapper = render({
        object
      })
      assert.ok(wrapper.find(".expanded-learning-resource-userlist").exists())
      R.zip(
        object.items.map(item => item.content_data),
        wrapper.find("LearningResourceRow").map(el => el.prop("object"))
      ).forEach(([obj1, obj2]) => assert.deepEqual(obj1, obj2))
    })
  })

  it(`should still display without errors in case of a bad course with no runs`, () => {
    course.runs = []
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

  //
  ;[
    [LR_TYPE_COURSE, false],
    [LR_TYPE_PROGRAM, false],
    [LR_TYPE_BOOTCAMP, false],
    [LR_TYPE_USERLIST, false],
    [LR_TYPE_VIDEO, true]
  ].forEach(([objectType, hasEmbedly]) => {
    it(`should ${
      hasEmbedly ? "" : "not "
    }display an embedly component for object_type=${objectType}`, () => {
      const object = makeLearningResource(objectType)
      const wrapper = render({ object })
      assert.equal(wrapper.find("Embedly").exists(), hasEmbedly)
      if (hasEmbedly) {
        assert.equal(
          wrapper
            .find("Embedly")
            .at(0)
            .prop("embedly"),
          embedly
        )
      }
    })
  })
})
