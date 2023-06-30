import React from "react"
import { faker } from "@faker-js/faker/locale/en"
import { render } from "@testing-library/react"
import Widget from "./Widget"
import { makeEmbeddedUrlWidget } from "../factories"
import { EmbedlyCard } from "ol-util"

jest.mock("ol-util", () => {
  const actual = jest.requireActual("ol-util")
  return {
    __esModule:  true,
    ...actual,
    EmbedlyCard: jest.fn(actual.EmbedlyCard)
  }
})
const spyEmbedlyCard = jest.mocked(EmbedlyCard)

describe("Widget-EmbeddedUrl", () => {
  test("it renderes <EmbedlyCard /> when url is set", () => {
    const url = new URL(faker.internet.url()).toString()
    const widget = makeEmbeddedUrlWidget({ configuration: { url } })
    render(<Widget widget={widget} />)
    expect(spyEmbedlyCard).toHaveBeenCalledWith(
      expect.objectContaining({ url }),
      expect.anything()
    )
  })
})
