import React from "react"
import { render, screen } from "@testing-library/react"
import { assertInstanceOf } from "ol-util"
import LearningResourceCard from "./LearningResourceCard"
import { makeMinimalResoure, makeImgConfig } from "../factories"
import { resourceThumbnailSrc } from "../util"

describe("LearningResourceCard", () => {
  it("renders title and cover image", () => {
    const resource = makeMinimalResoure()
    const imgConfig = makeImgConfig()
    render(<LearningResourceCard resource={resource} imgConfig={imgConfig} />)
    const heading = screen.getByRole("heading")

    // Alert! This should be empty unless it is meaningful.
    const coverImg = screen.getByAltText("")
    expect(heading).toHaveAccessibleName(resource.title)
    expect(coverImg).toHaveAccessibleName("")

    assertInstanceOf(coverImg, HTMLImageElement)
    expect(coverImg.src).toBe(resourceThumbnailSrc(resource, imgConfig))
  })

  it("has the correct embedly url", () => {
    const resource = makeMinimalResoure()
    const imgConfig = makeImgConfig()
    render(<LearningResourceCard resource={resource} imgConfig={imgConfig} />)
    const heading = screen.getByRole("heading")

    // Alert! This should be empty unless it is meaningful.
    const coverImg = screen.getByAltText("")
    expect(heading).toHaveAccessibleName(resource.title)
    expect(coverImg).toHaveAccessibleName("")
  })

  it.each([
    { certification: [], hasCertificate: false },
    { certification: undefined, hasCertificate: false },
    { certification: ["cert"], hasCertificate: true }
  ])(
    "should render an icon if the object has a certificate",
    ({ certification, hasCertificate }) => {
      const resource = makeMinimalResoure({ certification })
      const imgConfig = makeImgConfig()

      render(<LearningResourceCard resource={resource} imgConfig={imgConfig} />)
      const certIcon = screen.queryByAltText("Receive a certificate", {
        exact: false
      })
      expect(certIcon === null).not.toBe(hasCertificate)
    }
  )
})
