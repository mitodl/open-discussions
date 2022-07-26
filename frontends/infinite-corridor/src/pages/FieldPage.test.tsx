import { assertInstanceOf } from "ol-util"
import { urls } from "../api/fields"
import * as factory from "../api/fields/factories"
import { renderTestApp, screen, setMockResponse } from "../test-utils"

describe("FieldPage", () => {
  it("Displays the field name", async () => {
    const field = factory.makeField()
    setMockResponse.get(urls.fieldDetails(field.name), field)
    renderTestApp({ url: `/fields/${field.name}` })

    await screen.findByText(field.title)
  })

  it("Displays the field's thumbnail image", async () => {
    const field = factory.makeField()
    setMockResponse.get(urls.fieldDetails(field.name), field)
    renderTestApp({ url: `/fields/${field.name}` })

    const img = await screen.findByAltText(field.title, { exact: false })
    assertInstanceOf(img, HTMLImageElement)

    expect(img.src).toBe(field.avatar_small)
  })
})
