import {
  renderTestApp,
  screen,
  setMockResponse,
  fireEvent,
  user
} from "../../test-utils"
import * as factory from "../../api/fields/factories"
import { FieldChannel, urls } from "../../api/fields"
import { urls as widgetUrls } from "../../api/widgets"
import { urls as lrUrls } from "../../api/learning-resources"
import { waitFor } from "@testing-library/react"
import { makeFieldViewPath } from "../urls"
import { makeWidgetListResponse } from "ol-widgets/build/factories"

const setupApis = (fieldOverrides?: Partial<FieldChannel>) => {
  const field = factory.makeField({ is_moderator: true, ...fieldOverrides })
  setMockResponse.get(urls.fieldDetails(field.name), field)
  setMockResponse.get(lrUrls.userListsListing({ public: true }), [field])
  setMockResponse.get(
    widgetUrls.widgetList(field.widget_list),
    makeWidgetListResponse({}, { count: 0 })
  )
  return field
}

describe("EditFieldAppearanceForm", () => {
  it("Displays the field title, appearance inputs with current field values", async () => {
    const field = setupApis()
    expect(field.is_moderator).toBeTruthy()
    renderTestApp({ url: `${urls.fieldDetails(field.name)}manage/#appearance` })
    const descInput = (await screen.findByLabelText(
      "Description"
    )) as HTMLInputElement
    const titleInput = (await screen.findByLabelText(
      "Title"
    )) as HTMLInputElement
    expect(titleInput.value).toEqual(field.title)
    expect(descInput.value).toEqual(field.public_description)
  })

  it("Shows an error if a required field is blank", async () => {
    const field = setupApis()
    renderTestApp({ url: `${urls.fieldDetails(field.name)}manage/#appearance` })
    const titleInput = (await screen.findByLabelText(
      "Title"
    )) as HTMLInputElement
    const titleError = screen.queryByText("Title is required")
    expect(titleError).toBeNull()
    fireEvent.change(titleInput, {
      target: { value: "" }
    })
    fireEvent.blur(titleInput)
    await screen.findByText("Title is required")
  })

  it("updates field values on form submission", async () => {
    const field = setupApis({
      featured_list: null, // so we don't have to mock userList responses
      lists:         []
    })
    const newTitle = "New Title"
    const newDesc = "New Description"
    // Initial field values
    const updatedValues = {
      ...field,
      title:              newTitle,
      public_description: newDesc
    }
    setMockResponse.patch(urls.fieldDetails(field.name), updatedValues)
    const { history } = renderTestApp({
      url: `${urls.fieldDetails(field.name)}manage/#appearance`
    })
    const titleInput = (await screen.findByLabelText(
      "Title"
    )) as HTMLInputElement
    const descInput = (await screen.findByLabelText(
      "Description"
    )) as HTMLInputElement
    const submitBtn = await screen.findByText("Save")
    titleInput.setSelectionRange(0, titleInput.value.length)
    await user.type(titleInput, newTitle)
    descInput.setSelectionRange(0, descInput.value.length)
    await user.type(descInput, newDesc)
    // Expected field values after submit
    setMockResponse.get(urls.fieldDetails(field.name), updatedValues)
    await user.click(submitBtn)

    await waitFor(() => {
      expect(history.location.pathname).toBe(makeFieldViewPath(field.name))
    })
    await screen.findByText(newTitle)
    await screen.findByText(newDesc)
  })
})
