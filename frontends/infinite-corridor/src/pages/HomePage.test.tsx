import { assertInstanceOf, assertNotNil } from "ol-util"
import { zip } from "lodash"
import { FieldChannel, urls } from "../api/fields"
import { urls as widgetUrls } from "../api/widgets"
import { makeWidgetListResponse } from "ol-widgets"
import * as factories from "../api/fields/factories"
import {
  screen,
  renderTestApp,
  setMockResponse,
  within,
  sample,
  user
} from "../test-utils"
import { makeFieldViewPath } from "./urls"

const findFieldList = async (): Promise<HTMLElement> => {
  const list = await screen.findByRole("list")
  const section = list.closest("section")
  assertInstanceOf(section, HTMLElement)
  return section
}
const findAllFieldLinks = async () =>
  within(await findFieldList()).findAllByRole("link")
const findFieldLink = async (title: string): Promise<HTMLElement> => {
  const links = await findAllFieldLinks()
  const link = links.find(el => el.textContent === title)
  assertNotNil(link, `Could not find link with title "${title}".`)
  return link
}
const getSearchTextInput = (): HTMLInputElement => {
  const textInput = screen.getByPlaceholderText("Search for", { exact: false })
  assertInstanceOf(textInput, HTMLInputElement)
  return textInput
}

describe("HomePage", () => {
  test("Displays the field titles and thumbnails in links", async () => {
    const fieldsList = factories.makeFieldsPaginated(3)
    setMockResponse.get(urls.fieldsList, fieldsList)

    renderTestApp()

    const links = await findAllFieldLinks()

    zip(links, fieldsList.results).forEach(([link, field]) => {
      assertNotNil(link)
      assertNotNil(field)

      expect(link).toHaveTextContent(field.title)
      const image = within(link).getByRole("img")
      assertInstanceOf(image, HTMLImageElement)
      expect(image.src).toBe(field.avatar_medium)
    })
    expect.assertions(6) // double check loop assertions ran
  })

  test("Clicking on a link goes to the field page", async () => {
    const fieldsList = factories.makeFieldsPaginated(3)
    const field: FieldChannel = {
      ...sample(fieldsList.results),
      featured_list: null,
      lists:         []
    }
    setMockResponse.get(urls.fieldsList, fieldsList)
    setMockResponse.get(urls.fieldDetails(field.name), field)
    setMockResponse.get(
      widgetUrls.widgetList(field.widget_list),
      makeWidgetListResponse({}, { count: 0 })
    )

    const { history } = renderTestApp()
    const link = await findFieldLink(field.title)
    await user.click(link)
    expect(history.location.pathname).toBe(makeFieldViewPath(field.name))
  })

  test("Submitting search goes to search page", async () => {
    const fieldsList = factories.makeFieldsPaginated(0)
    setMockResponse.get(urls.fieldsList, fieldsList)
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
