import { assertInstanceOf } from "ol-util"

import { screen, renderTestApp, setMockResponse, user } from "../test-utils"

const getSearchTextInput = (): HTMLInputElement => {
  const textInput = screen.getByPlaceholderText("What do you want to learn?", {
    exact: false
  })
  assertInstanceOf(textInput, HTMLInputElement)
  return textInput
}

describe("HomePage", () => {
  test("Submitting search goes to search page", async () => {
    setMockResponse.post("search/", { hits: { hits: [], total: 0 } })

    const { history } = renderTestApp()

    const textInput = getSearchTextInput()
    await user.type(textInput, "Physics or math{Enter}")
    expect(history.location).toStrictEqual(
      expect.objectContaining({
        pathname: "/infinite/search",
        search:   "?q=Physics+or+math"
      })
    )
  })
})
