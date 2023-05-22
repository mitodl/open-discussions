import { urls as fieldsUrls } from "../api/fields"
import { urls as learningResourceUrls } from "../api/learning-resources"

import * as factories from "../api/fields/factories"
import { renderTestApp, screen, setMockResponse, within } from "../test-utils"

describe("Header", () => {
  it("Includes a link to MIT Homepage", async () => {
    const fieldsList = factories.makeFieldsPaginated({ count: 0 })

    setMockResponse.get(fieldsUrls.fieldsList, fieldsList)
    setMockResponse.get(learningResourceUrls.course.upcoming(), [])
    setMockResponse.get(learningResourceUrls.video.new(), [])
    setMockResponse.get(learningResourceUrls.popularContent.listing(), [])

    renderTestApp()
    const header = screen.getByRole("banner")
    within(header).getByTitle("MIT Homepage", { exact: false })
  })
})
