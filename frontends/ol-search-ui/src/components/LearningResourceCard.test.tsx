import React from "react"
import { render, screen } from "@testing-library/react"
import { pick } from "lodash"
import { assertInstanceOf, Factory } from "ol-util"
import LearningResourceCard, {
  CardMinimalResource
} from "./LearningResourceCard"
import { makeCourseResult } from "../factories"
import type { EmbedlyConfig } from "../util"
import { resourceThumbnailSrc } from "../util"
import { faker } from "@faker-js/faker"

const makeMinimalResoure: Factory<CardMinimalResource> = overrides => {
  const keys = [
    "runs",
    "certification",
    "title",
    "offered_by",
    "object_type",
    "image_src",
    "platform"
  ] as const
  return {
    ...pick(makeCourseResult(), keys),
    ...overrides
  }
}

const makeImgConfig: Factory<EmbedlyConfig> = () => {
  return {
    width:      faker.datatype.number(),
    height:     faker.datatype.number(),
    embedlyKey: faker.datatype.uuid(),
    ocwBaseUrl: faker.internet.url()
  }
}

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
