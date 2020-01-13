// @flow
import { assert } from "chai"
import R from "ramda"

import ExpandedLearningResourceDisplay from "../components/ExpandedLearningResourceDisplay"
import * as UserListItemsMod from "../components/UserListItems"

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
  LR_TYPE_LEARNINGPATH,
  LR_TYPE_ALL
} from "../lib/constants"
import { mockHTMLElHeight } from "../lib/test_utils"
import { bestRun, getInstructorName } from "../lib/learning_resources"
import { shouldIf } from "../lib/test_utils"
import { defaultResourceImageURL } from "../lib/url"
import { capitalize } from "../lib/util"
import IntegrationTestHelper from "../util/integration_test_helper"
import { makeLearningResourceResult } from "../factories/search"

describe("ExpandedLearningResourceDisplay", () => {
  let course,
    embedly,
    helper,
    setShowResourceDrawerStub,
    render,
    similarResources

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    setShowResourceDrawerStub = helper.sandbox.stub()
    course = makeCourse()
    embedly = makeYoutubeVideo()
    similarResources = [
      makeLearningResourceResult(LR_TYPE_COURSE),
      makeLearningResourceResult(LR_TYPE_BOOTCAMP),
      makeLearningResourceResult(LR_TYPE_COURSE)
    ]
    mockHTMLElHeight(50, 100)
    helper.stubComponent(
      UserListItemsMod,
      "PaginatedUserListItems",
      "PaginatedUserListItems"
    )
    render = helper.configureHOCRenderer(
      ExpandedLearningResourceDisplay,
      ExpandedLearningResourceDisplay,
      {},
      {
        object:                course,
        runId:                 course.runs[0] ? course.runs[0].id : 0,
        setShowResourceDrawer: setShowResourceDrawerStub,
        embedly:               embedly,
        similarItems:          similarResources
      }
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  it(`should render a course image`, async () => {
    const { wrapper } = await render()
    assert.ok(
      wrapper
        .find(".image-div")
        .find("img")
        .prop("src")
        .includes("https://i.embed.ly/1/display/crop")
    )
    assert.ok(
      wrapper
        .find(".image-div")
        .find("img")
        .prop("src")
        // $FlowFixMe: this won't be null
        .includes(encodeURIComponent(course.image_src))
    )
  })

  it(`should render a default course image if none exists`, async () => {
    course.image_src = null
    const { wrapper } = await render()
    assert.ok(
      wrapper
        .find(".image-div")
        .find("img")
        .prop("src")
        .includes(encodeURIComponent(defaultResourceImageURL()))
    )
  })

  //
  ;[LR_TYPE_COURSE, LR_TYPE_PROGRAM].forEach(objectType => {
    [true, false].forEach(hasRunUrl => {
      it(`should render ${hasRunUrl ? "run" : objectType} link`, async () => {
        const object = makeLearningResource(objectType)
        const run = bestRun(object.runs)
        if (!hasRunUrl) {
          // $FlowFixMe: run is not null here
          run.url = null
        }
        const { wrapper } = await render(
          {},
          {
            object,
            // $FlowFixMe: course run won't be null here
            runId: run.id
          }
        )
        const link = wrapper.find(".external-links").find("a")
        // $FlowFixMe: run won't be null
        assert.equal(link.prop("href"), hasRunUrl ? run.url : object.url)
      })
    })
  })

  //
  ;[true, false].forEach(hasProgramUrl => {
    it(`${shouldIf(hasProgramUrl)} render program link`, async () => {
      const program = makeLearningResource(LR_TYPE_PROGRAM)
      program.runs[0].url = null
      if (!hasProgramUrl) {
        program.url = null
      }
      const { wrapper } = await render(
        {},
        {
          object: program
        }
      )
      const link = wrapper.find(".external-links").find("a")
      assert.equal(link.exists(), hasProgramUrl)
      if (hasProgramUrl) {
        assert.equal(link.prop("href"), program.url)
      }
    })
  })

  LR_TYPE_ALL.forEach(objectType => {
    it(`should render description using the TruncatedText for ${objectType}`, async () => {
      const object = makeLearningResource(objectType)
      const { wrapper } = await render({}, { object })
      const truncated = wrapper.find("TruncatedText")
      assert.equal(truncated.props().text, object.short_description)
    })

    it(`should render a title for ${objectType}`, async () => {
      const object = makeLearningResource(objectType)
      const { wrapper } = await render({}, { object })
      assert.equal(
        wrapper
          .find(".title")
          .at(0)
          .text(),
        object.title
      )
    })
  })

  it("should not render course links if urls are all null", async () => {
    course.url = null
    course.runs.forEach(run => (run.url = null))
    const { wrapper } = await render()
    assert.isNotOk(wrapper.find(".external-links").exists())
  })

  LR_TYPE_ALL.forEach(objectType => {
    it(`should display all topics for the ${objectType}`, async () => {
      const object = makeLearningResource(objectType)
      // $FlowFixMe
      object.offered_by = ["xPro"]
      const { wrapper } = await render(
        {},
        {
          object
        }
      )
      const topicDivs = wrapper.find(".topics").find(".grey-surround")
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
    it(`should display the correct date label and options for ${platform} courses`, async () => {
      course.platform = platform
      const courseRun = course.runs[0]
      courseRun.start_date = "2019-09-01T00:00:00Z"
      courseRun.semester = "Fall"
      courseRun.year = "2019"
      const { wrapper } = await render()
      const selectOptions = wrapper.find("option")
      assert.equal(selectOptions.length, course.runs.length)
      assert.equal(selectOptions.at(0).text(), expectedValue)
      const dateLabel = wrapper
        .find(".form")
        .at(0)
        .find(".info-label")
        .text()
      assert.equal(dateLabel, expectedLabel)
    })
  })

  it("should display 'Ongoing' for a course with no good dates", async () => {
    course.platform = "mitx"
    course.runs = course.runs.splice(0, 1)
    const courseRun = course.runs[0]
    courseRun.start_date = null
    courseRun.best_start_date = null
    const { wrapper } = await render()
    const dateDiv = wrapper.find(".select-semester-div")
    assert.equal(dateDiv.text(), "Ongoing")
  })

  //
  ;[[1, false], [2, true]].forEach(([runs, showDropdown]) => {
    it(`${shouldIf(
      showDropdown
    )} display a course run dropdown for a course with ${runs} run(s)`, async () => {
      course.runs = course.runs.slice(0, runs)
      const { wrapper } = await render()
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
    )}, best date ${String(bestDate)}`, async () => {
      course.platform = "mitx"
      const courseRun = course.runs[0]
      courseRun.start_date = startDate
      courseRun.best_start_date = bestDate
      const { wrapper } = await render()
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
    it(`should display all instructors for the ${objectType}`, async () => {
      const object = makeLearningResource(objectType)
      const { wrapper } = await render(
        {},
        {
          object,
          // $FlowFixMe: course run won't be null here
          runId: bestRun(object.runs).id
        }
      )
      const instructorText = wrapper
        .find(".school")
        .at(1)
        .closest(".info-row")
        .find(".value")
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
    )}`, async () => {
      // $FlowFixMe: course run won't be null here
      bestRun(course.runs).language = langCode
      // $FlowFixMe: course run won't be null here
      const { wrapper } = await render({}, { runId: bestRun(course.runs).id })
      assert.equal(
        wrapper
          .find(".language")
          .closest(".info-row")
          .find(".value")
          .text(),
        langName
      )
    })
  })

  //
  ;[LR_TYPE_COURSE, LR_TYPE_BOOTCAMP, LR_TYPE_PROGRAM].forEach(objectType => {
    it(`should display the platform in the link button text for ${objectType}`, async () => {
      const object = makeLearningResource(objectType)
      // $FlowFixMe
      object.offered_by = ["xPro"]
      const { wrapper } = await render(
        {},
        {
          object
        }
      )
      const linkText = wrapper.find(".link-button").text()
      assert.equal(
        linkText,
        objectType === LR_TYPE_BOOTCAMP
          ? "Take Bootcamp"
          : `Take ${capitalize(objectType)}`
      )
    })
  })

  //
  ;[LR_TYPE_COURSE, LR_TYPE_BOOTCAMP, LR_TYPE_PROGRAM].forEach(objectType => {
    it(`should display the cost for ${objectType}`, async () => {
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

      const { wrapper } = await render(
        {},
        {
          object,
          // $FlowFixMe
          runId: run.id
        }
      )
      assert.equal(
        wrapper
          .find(".attach_money")
          .closest(".info-row")
          .find(".value")
          .text(),
        "$25.50"
      )
    })
  })

  //
  ;[LR_TYPE_USERLIST, LR_TYPE_LEARNINGPATH].forEach(objectType => {
    it(`should display the authors name for ${objectType}`, async () => {
      const object = makeLearningResource(objectType)
      const { wrapper } = await render(
        {},
        {
          object
        }
      )
      assert.equal(
        wrapper
          .find(".local_offer")
          .closest(".info-row")
          .find(".value")
          .text(),
        object.author_name
      )
    })

    it(`should display the privacy for ${objectType}`, async () => {
      const object = makeLearningResource(objectType)
      const { wrapper } = await render(
        {},
        {
          object
        }
      )
      assert.equal(
        wrapper
          .find(".lock")
          .closest(".info-row")
          .find(".value")
          .text(),
        capitalize(object.privacy_level)
      )
    })

    it(`should display the length for ${objectType}`, async () => {
      const object = makeLearningResource(objectType)
      const { wrapper } = await render(
        {},
        {
          object
        }
      )
      assert.equal(
        wrapper
          .find(".view_list")
          .closest(".info-row")
          .find(".value")
          .text(),
        object.item_count
      )
    })

    it(`should include a display of list items for ${objectType}`, async () => {
      const object = makeLearningResource(objectType)
      const { wrapper } = await render(
        {},
        {
          object
        }
      )

      const listItemsDiv = wrapper
        .find(".expanded-learning-resource-list")
        .at(0)

      assert.isNotOk(listItemsDiv.find("PaginatedUserListItems").exists())
      listItemsDiv.find("i").simulate("click")

      const items = wrapper.find("PaginatedUserListItems")
      assert.isOk(items.exists())
      assert.deepEqual(items.at(0).props(), {
        userList: object,
        pageSize: 10
      })
    })
  })

  it("should include a display of list items for program", async () => {
    const object = makeLearningResource(LR_TYPE_PROGRAM)
    const { wrapper } = await render(
      {},
      {
        object
      }
    )

    const listItemsDiv = wrapper.find(".expanded-learning-resource-list").at(0)

    assert.equal(listItemsDiv.find("LearningResourceRow").length, 0)
    listItemsDiv.find("i").simulate("click")
    assert.equal(
      wrapper
        .find(".expanded-learning-resource-list")
        .at(0)
        .find("LearningResourceRow").length,
      object.items.length
    )
    R.zip(
      object.items.map(item => item.content_data),
      wrapper
        .find(".expanded-learning-resource-list")
        .at(0)
        .find("LearningResourceRow")
        .map(el => el.prop("object"))
    ).forEach(([obj1, obj2]) => assert.deepEqual(obj1, obj2))
  })

  //
  ;[LR_TYPE_COURSE, LR_TYPE_BOOTCAMP].forEach(objectType => {
    it(`should not include a display of list items for ${objectType}`, async () => {
      const object = makeLearningResource(objectType)
      const { wrapper } = await render(
        {},
        {
          object
        }
      )
      assert.equal(wrapper.find(".expanded-learning-resource-list").length, 1)
      assert.isOk(
        wrapper
          .find(".expanded-learning-resource-list")
          .text()
          .startsWith("Similar Learning Resources")
      )
    })
  })

  LR_TYPE_ALL.forEach(resourceType => {
    it(`should include a display of similar resources for ${resourceType}`, async () => {
      const object = makeLearningResource(resourceType)
      const listIdx = [
        LR_TYPE_LEARNINGPATH,
        LR_TYPE_USERLIST,
        LR_TYPE_PROGRAM
      ].includes(resourceType)
        ? 1
        : 0
      const { wrapper } = await render(
        {},
        {
          object,
          similarItems: similarResources
        }
      )
      const similarResourcesDiv = wrapper
        .find(".expanded-learning-resource-list")
        .at(listIdx)
      assert.ok(similarResourcesDiv.exists())
      assert.equal(similarResourcesDiv.find("LearningResourceRow").length, 0)
      similarResourcesDiv.find("i").simulate("click")
      assert.equal(
        wrapper
          .find(".expanded-learning-resource-list")
          .at(listIdx)
          .find("LearningResourceRow").length,
        3
      )
    })
  })

  it(`should still display without errors in case of a bad course with no runs`, async () => {
    course.runs = []
    const { wrapper } = await render()
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
        .closest(".info-row")
        .find(".value")
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
    }display an embedly component for object_type=${objectType}`, async () => {
      const object = makeLearningResource(objectType)
      const { wrapper } = await render({}, { object })
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
