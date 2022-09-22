import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { faker } from "@faker-js/faker"
import { assertInstanceOf, assertNotNil } from "ol-util"
import { getByTerm, queryByTerm } from "ol-util/build/test-utils"
import LearningResourceDetails, {
  LearningResourceDetailsProps
} from "./ExpandedLearningResourceDisplay"
import {
  makeCourseResult,
  makeImgConfig,
  makeRun,
  makeVideoResult
} from "../factories"
import { resourceThumbnailSrc, getInstructorName } from "../util"

const renderLearningResourceDetails = (
  overrides: Partial<LearningResourceDetailsProps>
): LearningResourceDetailsProps => {
  const resource = makeCourseResult()
  const imgConfig = makeImgConfig()
  const props = { resource, imgConfig, ...overrides }
  render(<LearningResourceDetails {...props} />)
  return props
}

describe("ExpandedLearningResourceDisplay", () => {
  it("renders the expected fields for a course", () => {
    const run = makeRun()
    const offerer = "ocw"
    const resource = makeCourseResult({ runs: [run], offered_by: [offerer] })

    const { imgConfig } = renderLearningResourceDetails({ resource })

    const instructors = resource.runs[0].instructors
      .map(instructor => getInstructorName(instructor))
      .join(", ")

    screen.getByText(resource.title)
    screen.getByText(instructors)
    screen.getByText(offerer)

    const coverImg = screen.getByAltText("")
    assertInstanceOf(coverImg, HTMLImageElement)
    expect(coverImg).toHaveAccessibleName("")
    expect(coverImg.src).toBe(resourceThumbnailSrc(resource, imgConfig))
  })

  it.each([
    { level: null, shouldDisplay: false },
    { level: "", shouldDisplay: false },
    { level: "Really hard", shouldDisplay: true }
  ])("Displays 'Level' iff there is one", ({ level, shouldDisplay }) => {
    const run = makeRun({ level })
    const resource = makeCourseResult({ runs: [run] })
    renderLearningResourceDetails({ resource })
    const el = queryByTerm(document.body, "Level:")
    if (shouldDisplay) {
      expect(el).toHaveTextContent(level as string)
    } else {
      expect(el).toBe(null)
    }
  })

  it("renders the expected fields for a video", () => {
    const offeredBy = faker.word.noun()
    const resource = makeVideoResult({ offered_by: [offeredBy] })

    renderLearningResourceDetails({ resource })

    screen.getByText(resource.title)
    screen.getByText(offeredBy)

    expect(queryByTerm(document.body, "Level:")).toBe(null)
    getByTerm(document.body, "Duration:")
    getByTerm(document.body, "Date Posted:")

    const a = screen.getByRole("link")
    assertInstanceOf(a, HTMLAnchorElement)
    expect(a.href).toBe(resource.url?.toLowerCase())
    expect(a.dataset.cardChrome).toBe("0")
    expect(a.dataset.cardControls).toBe("0")
    expect(a.dataset.cardKey).toBe("fake")
    expect(a).toHaveClass("embedly-card")
  })

  it.each([
    { certification: [], hasCertificate: false },
    { certification: ["cert"], hasCertificate: true }
  ])(
    "should render an icon if the object has a certificate",
    ({ certification, hasCertificate }) => {
      const resource = makeCourseResult({ certification })

      renderLearningResourceDetails({ resource })
      const certIcon = screen.queryByAltText("Receive a certificate", {
        exact: false
      })
      expect(certIcon === null).not.toBe(hasCertificate)
    }
  )

  it("renders the default cover image if none exists", () => {
    const resource = makeCourseResult({ image_src: null })
    renderLearningResourceDetails({ resource })

    const coverImg = screen.getByAltText("")
    assertInstanceOf(coverImg, HTMLImageElement)
    expect(coverImg.src).toContain("default_resource_thumb.jpg")
  })

  it("renders the run url if it is set", () => {
    const run = makeRun()
    const resource = makeCourseResult({ runs: [run] })
    renderLearningResourceDetails({ resource })
    const link = screen.getByRole("link")
    assertInstanceOf(link, HTMLAnchorElement)
    assertNotNil(run.url)
    expect(link.href).toBe(run.url.toLowerCase())
  })

  it("renders the object url if the run url is not set", () => {
    const run = makeRun({ url: null })
    const resource = makeCourseResult({ runs: [run], url: "www.aurl.com" })

    renderLearningResourceDetails({ resource })
    const link = screen.getByRole("link")
    assertInstanceOf(link, HTMLAnchorElement)
    expect(link.href).toContain(resource.url)
  })

  it.each([
    { numRuns: 1, hasDropdown: false },
    { numRuns: 2, hasDropdown: true }
  ])(
    "should render an drop down to select runs if there are at least two runs",
    ({ numRuns, hasDropdown }) => {
      const runs = Array(numRuns)
        .fill(null)
        .map(() => makeRun())
      const resource = makeCourseResult({ runs })
      renderLearningResourceDetails({ resource })
      const runDropdown = screen.queryByRole("combobox")
      expect(runDropdown === null).not.toBe(hasDropdown)
    }
  )

  it.each([
    { languageCode: "en-us", language: "English" },
    { languageCode: "fr", language: "French" },
    { languageCode: "zh-CN", language: "Chinese" },
    { languageCode: null, language: "English" },
    { languageCode: "", language: "English" }
  ])("should render the course language", ({ languageCode, language }) => {
    const run = makeRun({ language: languageCode })
    const resource = makeCourseResult({ runs: [run] })
    renderLearningResourceDetails({ resource })
    screen.getByText(language)
  })

  it("formats and renders the cost", () => {
    const run = makeRun({ prices: [{ price: 25.5, mode: "" }] })
    const resource = makeCourseResult({ runs: [run] })
    renderLearningResourceDetails({ resource })
    expect(screen.getByText("$25.50")).toBeInTheDocument()
  })

  it("has a share button with the direct url for the resource", async () => {
    const resource = makeCourseResult()
    renderLearningResourceDetails({ resource })

    const learningResourcePermalink = `${window.location.origin}${window.location.pathname}?resourceId=${resource.id}&resourceType=${resource.object_type}`

    await fireEvent.click(screen.getByText("Share"))
    screen.getByDisplayValue(learningResourcePermalink)
  })
})
