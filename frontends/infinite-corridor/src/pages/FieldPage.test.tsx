import { assertInstanceOf } from "ol-util"
import { urls } from "../api/fields"
import * as factory from "../api/fields/factories"
import { renderTestApp, screen, setMockResponse, within } from "../test-utils"

describe("FieldPage", () => {
  it("Displays the field title, banner, and avatar", async () => {
    const field = factory.makeField()
    setMockResponse.get(urls.fieldDetails(field.name), field)
    renderTestApp({ url: `/fields/${field.name}` })

    const title = await screen.findByText(field.title)
    const header = title.closest('header')
    assertInstanceOf(header, HTMLElement)
    const images = within(header).getAllByRole('img') as HTMLImageElement[]

    expect(images).toEqual([
      /**
       * Unless it is meaningful, the alt text should be an empty string, and
       * the channel header already has a title.
       */
      expect.objectContaining({ src: field.banner, alt: "" }),
      expect.objectContaining({ src: field.avatar_medium, alt: "" })
    ])
  })
})
