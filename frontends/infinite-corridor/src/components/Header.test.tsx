import { urls } from "../api/fields"
import * as factories from "../api/fields/factories"
import { renderTestApp, screen, setMockResponse, within } from "../test-utils"

describe("Header", () => {
  it("Includes a link to MIT Homepage", async () => {
    const fieldsList = factories.makeFieldList(0)
    setMockResponse.get(urls.fieldsList, fieldsList)

    renderTestApp()
    const header = screen.getByRole("banner")
    within(header).getByTitle("MIT Homepage", { exact: false })
  })
})
