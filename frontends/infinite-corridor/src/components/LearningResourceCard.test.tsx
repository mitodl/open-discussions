import React from "react"
import { mount } from "enzyme"
import { LearningResourceCard } from "./LearningResourceCard"

import { makeSearchResult } from "../factories/search"
import {
  searchResultToLearningResource,
  readableLearningResources
} from "ol-search-ui"

describe("LearningResourceCard component", () => {
  const render = object => mount(<LearningResourceCard object={object} />)

  it.each([{ resourceType: "course" }, { resourceType: "program" }])(
    "should render the things we expect for a $resoureType",
    ({ resourceType }) => {
      const object = searchResultToLearningResource(
        makeSearchResult(resourceType)._source
      )

      const view = render(object)
      expect(view.find(".resource-type").text()).toBe(
        readableLearningResources[resourceType]
      )
      expect(view.find(".course-title").text()).toBe(object.title)
      expect(view.find(".subtitles").first().text()).toContain(
        object.offered_by[0]
      )
      expect(view.find("CoverImage").length).toBe(1)
    }
  )

  it.each([true, false])(
    "should render an icon if the object has a certificate",
    ({ hasCertificate }) => {
      const object = searchResultToLearningResource(
        makeSearchResult("course")._source
      )

      if (hasCertificate) {
        object.certification = new Array("A certificate")
      } else {
        object.certification = []
      }

      const view = render(object)

      if (hasCertificate) {
        expect(view.find(".audience-certificates .img").length).toBe(1)
      } else {
        expect(view.find(".audience-certificates .img").length).toBe(0)
      }
    }
  )
})
