import { assertInstanceOf } from "ol-util"
import { urls } from "../api/fields"
import * as factories from "../api/fields/factories"
import { renderTestApp, screen, setMockResponse, within } from "../test-utils"

describe("Header", () => {
  it("Includes a link to MIT Homepage", async () => {
    const fieldsList = factories.makeFieldsPaginated(0)
    setMockResponse.get(urls.fieldsList, fieldsList)

    renderTestApp()
    const header = screen.getByRole("banner")
    within(header).getByTitle("MIT Homepage", { exact: false })
  })

  it("Includes a link to Infinite Corridor homepage", async () => {
    const fieldsList = factories.makeFieldsPaginated(0)
    setMockResponse.get(urls.fieldsList, fieldsList)

    renderTestApp()
    const header = screen.getByRole("banner")
    const title = within(header).getByText("Infinite Corridor")
    assertInstanceOf(title, HTMLAnchorElement)
    expect(title.href).toBe("/infinite")
  })
})
