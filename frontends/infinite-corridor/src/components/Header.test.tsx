import { urls as fieldsUrls } from "../api/fields"
import { urls as lrUrls } from "../api/learning-resources"

import * as factories from "../api/fields/factories"
import { renderTestApp, screen, setMockResponse, within } from "../test-utils"

describe("Header", () => {
  it("Includes a link to MIT Homepage", async () => {
    const fieldsList = factories.makeFieldsPaginated({ count: 0 })

    setMockResponse.get(fieldsUrls.fieldsList, fieldsList)
    setMockResponse.get(lrUrls.course.upcoming(), [])
    setMockResponse.get(
      lrUrls.course.upcoming({ offered_by: "Micromasters" }),
      []
    )
    setMockResponse.get(lrUrls.video.new(), [])
    setMockResponse.get(lrUrls.popularContent.listing(), [])

    renderTestApp()
    const header = screen.getByRole("banner")
    within(header).getByTitle("MIT Homepage", { exact: false })
  })
})
