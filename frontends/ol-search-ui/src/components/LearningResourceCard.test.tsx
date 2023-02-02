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

  it.each([
    { suppressImage: false, hasNoImage: false },
    { suppressImage: true, hasNoImage: true }
  ])(
    "does not show an image iff suppressImage is true",
    ({ suppressImage, hasNoImage }) => {
      const resource = makeCourse({
        // if has certificates, we'll get extra images. Simpler to have none for this test.
        certification: []
      })
      const imgConfig = makeImgConfig()
      render(
        <LearningResourceCard
          resource={resource}
          imgConfig={imgConfig}
          suppressImage={suppressImage}
        />
      )
      const coverImg = screen.queryByRole("img")
      expect(coverImg === null).toBe(hasNoImage)
    }
  )

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

  it.each([
    { itemCount: 0, expectedText: "0 items" },
    { itemCount: 1, expectedText: "1 item" },
    { itemCount: 2, expectedText: "2 items" }
  ])("Renders item count for UserLists", ({ itemCount, expectedText }) => {
    const resource = makeUserList({ item_count: itemCount })
    const imgConfig = makeImgConfig()
    render(<LearningResourceCard resource={resource} imgConfig={imgConfig} />)
    screen.getByText(expectedText)
  })

  it("Does not render item count for courses, etc", () => {
    const resource = makeCourse()
    const imgConfig = makeImgConfig()
    render(<LearningResourceCard resource={resource} imgConfig={imgConfig} />)
    expect(screen.queryByText("item", { exact: false })).toBe(null)
  })
})
