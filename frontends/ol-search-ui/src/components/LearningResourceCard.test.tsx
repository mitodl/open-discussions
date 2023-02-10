import React from "react"
import { render, screen } from "@testing-library/react"
import { assertInstanceOf } from "ol-util"
import LearningResourceCard from "./LearningResourceCard"
import { makeCourse, makeUserList, makeImgConfig } from "../factories"
import { resourceThumbnailSrc } from "../util"

describe("LearningResourceCard", () => {
  it("renders title and cover image", () => {
    const resource = makeCourse()
    const imgConfig = makeImgConfig()
    render(<LearningResourceCard resource={resource} imgConfig={imgConfig} />)
    const heading = screen.getByRole("heading")

    const coverImg = screen.getByRole("img", { name: "" })
    assertInstanceOf(coverImg, HTMLImageElement)
    expect(heading).toHaveAccessibleName(resource.title)
    expect(coverImg.alt).toBe("") // Alert! This should be empty unless it is meaningful.
    expect(coverImg.src).toBe(resourceThumbnailSrc(resource, imgConfig))
  })

  it("has the correct embedly url", () => {
    const resource = makeCourse()
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
      const resource = makeCourse({ certification })
      const imgConfig = makeImgConfig()

      render(<LearningResourceCard resource={resource} imgConfig={imgConfig} />)
      const certIcon = screen.queryByAltText("Receive a certificate", {
        exact: false
      })
      expect(certIcon === null).not.toBe(hasCertificate)
    }
  )
})
