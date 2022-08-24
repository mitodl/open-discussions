import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { assertInstanceOf } from "ol-util"
import ExpandedLearningResourceDisplay from "./ExpandedLearningResourceDisplay"
import { makeMinimalResoure, makeImgConfig } from "../factories"
import { resourceThumbnailSrc, getInstructorName } from "../util"

describe("ExpandedLearningResourceDisplay", () => {
  it("renders the expected fields", () => {
    const resource = makeMinimalResoure()
    const imgConfig = makeImgConfig({
      embedlyKey: SETTINGS.embedlyKey,
      ocwBaseUrl: SETTINGS.ocw_next_base_url,
      width:      440,
      height:     239
    })

    render(
      <ExpandedLearningResourceDisplay
        object={resource}
        runId={resource.runs[0].id}
        setShowResourceDrawer={null}
      />
    )

    expect(screen.getByText(resource.title)).toBeInTheDocument()

    const instructors = resource.runs[0].instructors
      .map(instructor => getInstructorName(instructor))
      .join(", ")
    expect(screen.getByText(instructors)).toBeInTheDocument()

    expect(screen.getByText(resource.offered_by)).toBeInTheDocument()
    if (resource.runs[0].level) {
      expect(screen.getByText(resource.runs[0].level)).toBeInTheDocument()
      expect(screen.getByText("Level:")).toBeInTheDocument()
    } else {
      expect(screen.queryByText("Level:")).toBe(null)
    }

    const coverImg = screen.getByAltText("")
    expect(coverImg).toHaveAccessibleName("")

    assertInstanceOf(coverImg, HTMLImageElement)
    expect(coverImg.src).toBe(resourceThumbnailSrc(resource, imgConfig))
  })

  it.each([
    { certification: [], hasCertificate: false },
    { certification: undefined, hasCertificate: false },
    { certification: ["cert"], hasCertificate: true }
  ])(
    "should render an icon if the object has a certificate",
    ({ certification, hasCertificate }) => {
      const resource = makeMinimalResoure({ certification })

      render(
        <ExpandedLearningResourceDisplay
          object={resource}
          runId={resource.runs[0].id}
          setShowResourceDrawer={null}
        />
      )
      const certIcon = screen.queryByAltText("Receive a certificate", {
        exact: false
      })
      expect(certIcon === null).not.toBe(hasCertificate)
    }
  )

  it("renders the default cover image if none exists", () => {
    const resource = makeMinimalResoure({ image_src: null })
    render(
      <ExpandedLearningResourceDisplay
        object={resource}
        runId={resource.runs[0].id}
        setShowResourceDrawer={null}
      />
    )

    const coverImg = screen.getByAltText("")
    expect(coverImg.src).toContain("default_resource_thumb.jpg")
  })

  it("renders the run url if it is set", () => {
    const resource = makeMinimalResoure()
    render(
      <ExpandedLearningResourceDisplay
        object={resource}
        runId={resource.runs[0].id}
        setShowResourceDrawer={null}
      />
    )
    const link = screen.getByRole("link")
    expect(link.href).toBe(resource.runs[0].url.toLowerCase())
  })

  it("renders the object url if the run url is not set", () => {
    const resource = makeMinimalResoure()
    resource.runs[0].url = null
    resource.url = "www.aurl.com"

    render(
      <ExpandedLearningResourceDisplay
        object={resource}
        runId={resource.runs[0].id}
        setShowResourceDrawer={null}
      />
    )
    const link = screen.getByRole("link")
    expect(link.href).toContain(resource.url)
  })

  it.each([
    { numRuns: 1, hasDropdown: false },
    { numRuns: 2, hasDropdown: true }
  ])(
    "should render an drop down to select runs if there are at least two runs",
    ({ numRuns, hasDropdown }) => {
      const resource = makeMinimalResoure()
      resource.runs = resource.runs.slice(0, numRuns)
      render(
        <ExpandedLearningResourceDisplay
          object={resource}
          runId={resource.runs[0].id}
          setShowResourceDrawer={null}
        />
      )
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
    const resource = makeMinimalResoure()
    resource.runs[0].language = languageCode
    render(
      <ExpandedLearningResourceDisplay
        object={resource}
        runId={resource.runs[0].id}
        setShowResourceDrawer={null}
      />
    )
    expect(screen.getByText(language)).toBeInTheDocument()
  })

  it("formats and renders the cost", () => {
    const resource = makeMinimalResoure()
    resource.runs[0].prices = [{ price: 25.5, mode: "" }]
    render(
      <ExpandedLearningResourceDisplay
        object={resource}
        runId={resource.runs[0].id}
        setShowResourceDrawer={null}
      />
    )
    expect(screen.getByText("$25.50")).toBeInTheDocument()
  })

  it("has a share button with the direct url for the resource", async () => {
    const resource = makeMinimalResoure()
    render(
      <ExpandedLearningResourceDisplay
        object={resource}
        runId={resource.runs[0].id}
        setShowResourceDrawer={null}
      />
    )

    const learningResourcePermalink = `${window.location.origin}${window.location.pathname}?resourceId=${resource.id}&resourceType=${resource.object_type}`

    await waitFor(async () => {
      await fireEvent.click(screen.getByText("Share"))
    })

    expect(
      screen.getByDisplayValue(learningResourcePermalink)
    ).toBeInTheDocument()
  })
})
