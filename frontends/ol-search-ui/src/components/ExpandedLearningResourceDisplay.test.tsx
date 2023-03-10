import React from "react"
import { render, screen, fireEvent, within } from "@testing-library/react"
import user from "@testing-library/user-event"
import { faker } from "@faker-js/faker"
import { assertInstanceOf, assertNotNil } from "ol-util"
import { getByTerm, queryByTerm } from "ol-util/src/test-utils"
import { makeUrl } from "ol-util/src/factories"
import LearningResourceDetails, {
  LearningResourceDetailsProps
} from "./ExpandedLearningResourceDisplay"
import { makeCourse, makeImgConfig, makeRun, makeVideo } from "../factories"
import { resourceThumbnailSrc, getInstructorName, findBestRun } from "../util"

const formatShareLink: LearningResourceDetailsProps["formatShareLink"] = r =>
  `www.tests.org?resource_id=${r.id}&resource_type=${r.object_type}`

const renderLearningResourceDetails = (
  overrides: Partial<LearningResourceDetailsProps> = {}
): LearningResourceDetailsProps => {
  const resource = makeCourse()
  const imgConfig = makeImgConfig()
  const props = { resource, imgConfig, formatShareLink, ...overrides }
  render(<LearningResourceDetails {...props} />)
  return props
}

describe("ExpandedLearningResourceDisplay", () => {
  it("renders the expected fields for a course", () => {
    const run = makeRun()
    const offerer = "ocw"
    const resource = makeCourse({ runs: [run], offered_by: [offerer] })

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

    expect(queryByTerm(document.body, "Date Posted:")).toBe(null)
  })

  it.each([
    { level: null, shouldDisplay: false },
    { level: "", shouldDisplay: false },
    { level: "Really hard", shouldDisplay: true }
  ])("Displays 'Level' iff there is one", ({ level, shouldDisplay }) => {
    const run = makeRun({ level })
    const resource = makeCourse({ runs: [run] })
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
    const resource = makeVideo({ offered_by: [offeredBy] })

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
      const resource = makeCourse({ certification })

      renderLearningResourceDetails({ resource })
      const certIcon = screen.queryByAltText("Receive a certificate", {
        exact: false
      })
      expect(certIcon === null).not.toBe(hasCertificate)
    }
  )

  it("renders the default cover image if none exists", () => {
    const resource = makeCourse({ image_src: null })
    renderLearningResourceDetails({ resource })

    const coverImg = screen.getByAltText("")
    assertInstanceOf(coverImg, HTMLImageElement)
    expect(coverImg.src).toContain("default_resource_thumb.jpg")
  })

  it("renders the run url if it is set", () => {
    const run = makeRun()
    const resource = makeCourse({ runs: [run] })
    renderLearningResourceDetails({ resource })
    const link = screen.getByRole("link")
    assertInstanceOf(link, HTMLAnchorElement)
    assertNotNil(run.url)
    expect(link.href).toBe(run.url.toLowerCase())
  })

  it("renders the object url if the run url is not set", () => {
    const run = makeRun({ url: null })
    const resource = makeCourse({ runs: [run], url: "www.aurl.com" })

    renderLearningResourceDetails({ resource })
    const link = screen.getByRole("link")
    assertInstanceOf(link, HTMLAnchorElement)
    expect(link.href).toContain(resource.url)
  })

  it.each([
    { languageCode: "en-us", language: "English" },
    { languageCode: "fr", language: "French" },
    { languageCode: "zh-CN", language: "Chinese" },
    { languageCode: null, language: "English" },
    { languageCode: "", language: "English" }
  ])("should render the course language", ({ languageCode, language }) => {
    const run = makeRun({ language: languageCode })
    const resource = makeCourse({ runs: [run] })
    renderLearningResourceDetails({ resource })
    screen.getByText(language)
  })

  it("formats and renders the cost", () => {
    const run = makeRun({ prices: [{ price: 25.5, mode: "" }] })
    const resource = makeCourse({ runs: [run] })
    renderLearningResourceDetails({ resource })
    expect(screen.getByText("$25.50")).toBeInTheDocument()
  })

  it("has a share button with the direct url for the resource", async () => {
    const resource = makeCourse()
    renderLearningResourceDetails({ resource })

    const expectedLink = formatShareLink(resource)

    await fireEvent.click(screen.getByText("Share"))
    screen.getByDisplayValue(expectedLink)
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
      const resource = makeCourse({ runs })
      renderLearningResourceDetails({ resource })
      const runDropdown = screen.queryByRole("combobox")
      expect(runDropdown === null).not.toBe(hasDropdown)
    }
  )

  it("Initially selects the 'best' run", () => {
    const runs = Array(4)
      .fill(null)
      .map(() => makeRun())
    const bestRun = findBestRun(runs)
    assertNotNil(bestRun)

    const resource = makeCourse({ runs })
    renderLearningResourceDetails({ resource })
    const runDropdown = screen.queryByRole("combobox")
    assertInstanceOf(runDropdown, HTMLSelectElement)

    expect(runDropdown.value).toBe(String(bestRun.id))
  })

  it("should update the info when course run changes", async () => {
    /**
     * This test is slightly annoying to write because the initially selected
     * could be any of the `resource.runs`.
     */

    const url0 = makeUrl()
    const url1 = makeUrl()
    const run0 = makeRun({ url: url0 })
    const run1 = makeRun({ url: url1 })
    const runs = [run0, run1]
    const resource = makeCourse({ runs: [run0, run1] })
    renderLearningResourceDetails({ resource })

    const dropdown = screen.getByRole("combobox")
    const options = within(dropdown).getAllByRole(
      "option"
    ) as HTMLOptionElement[]

    /**
     * The initially selected option
     */
    const optA = options.find(e => e.selected)
    /**
     * The initially unspected option
     */
    const optB = options.find(e => !e.selected)
    assertNotNil(optA)
    assertNotNil(optB)

    const runA = runs.find(r => r.id === +optA.value)
    const runB = runs.find(r => r.id === +optB.value)
    assertNotNil(runA)
    assertNotNil(runB)

    const link = screen.getByRole("link")
    assertInstanceOf(link, HTMLAnchorElement)

    expect(link.href).toBe(runA.url)

    await user.selectOptions(dropdown, optB)

    expect(link.href).toBe(runB.url)
  })
})
