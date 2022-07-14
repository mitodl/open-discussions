import { urls } from "../api/fields"
import * as factories from "../api/fields/factories"
import { screen, renderTestApp, setMockResponse } from "../test-utils"
describe("HomePage", () => {
  it("Displays the field titles in links", async () => {
    const fieldsList = factories.makeFieldList(4)
    setMockResponse.get(urls.fieldsList, fieldsList)

    renderTestApp()
    const links = await screen.findAllByRole("link")
    expect(links).toHaveLength(4)
    expect(links.map((el) => el.textContent)).toStrictEqual(
      fieldsList.results.map((f) => f.title)
    )
  })
})
