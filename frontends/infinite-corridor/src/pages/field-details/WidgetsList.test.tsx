import React from "react"
import {
  renderWithProviders,
  screen,
  waitFor,
  expectProps,
  user
} from "../../test-utils"
import { Widget, WidgetsListEditable } from "ol-widgets"
import { makeWidgetListResponse } from "ol-widgets/src/factories"
import WidgetsList from "./WidgetsList"
import { setMockResponse } from "../../test-utils"
import { urls } from "../../api/widgets"
import { makeRequest } from "../../test-utils/mockAxios"

jest.mock("ol-widgets", () => {
  const actual = jest.requireActual("ol-widgets")
  return {
    __esModule:          true,
    ...actual,
    Widget:              jest.fn(actual.Widget),
    WidgetsListEditable: jest.fn(actual.WidgetsListEditable)
  }
})
const spyWidget = jest.mocked(Widget)
const spyWidgetsListEditable = jest.mocked(WidgetsListEditable)

const setupApis = ({ widgets = 3 } = {}) => {
  const widgetsList = makeWidgetListResponse({}, { count: widgets })
  setMockResponse.get(urls.widgetList(widgetsList.id), widgetsList)
  return { widgetsList }
}

describe("Viewing widgets with WidgetsList", () => {
  test("Renders widgets", async () => {
    const { widgetsList } = setupApis({ widgets: 3 })
    renderWithProviders(
      <WidgetsList isEditing={false} widgetListId={widgetsList.id} />
    )

    /**
     * Check that widget components are still on-screen
     */
    const { widgets } = widgetsList
    await waitFor(() => {
      screen.getByRole("heading", { name: widgets[0].title })
      screen.getByRole("heading", { name: widgets[1].title })
      screen.getByRole("heading", { name: widgets[2].title })
    })

    /**
     * Check that the Widget component was called with correct props
     */
    expectProps(spyWidget, { widget: widgets.at(-1) }, -1)
    expectProps(spyWidget, { widget: widgets.at(-2) }, -2)
    expectProps(spyWidget, { widget: widgets.at(-3) }, -3)
  })
})

describe("Editing widgets with WidgetsList", () => {
  it("renders WidgetsListEditable with expected stuff", async () => {
    const { widgetsList } = setupApis({ widgets: 3 })
    renderWithProviders(
      <WidgetsList isEditing={true} widgetListId={widgetsList.id} />
    )

    /**
     * Check that widget components are still on-screen
     */
    const { widgets } = widgetsList
    await waitFor(() => {
      screen.getByRole("heading", { name: widgets[0].title })
      screen.getByRole("heading", { name: widgets[1].title })
      screen.getByRole("heading", { name: widgets[2].title })
    })
    expectProps(spyWidgetsListEditable, { widgetsList }, -1)
  })

  it("makes the expected API call when WidgetsListEditable is edited+submitted", async () => {
    const { widgetsList } = setupApis({ widgets: 3 })
    renderWithProviders(
      <WidgetsList isEditing={true} widgetListId={widgetsList.id} />
    )
    const deleteBtns = await screen.findAllByRole("button", { name: /Delete/ })
    expect(deleteBtns.length).toBe(3)
    await user.click(deleteBtns[0])
    const modified = {
      ...widgetsList,
      widgets: widgetsList.widgets.slice(1)
    }
    setMockResponse.patch(urls.widgetList(widgetsList.id), modified)
    await user.click(screen.getByRole("button", { name: "Done" }))
    expect(makeRequest).toHaveBeenCalledWith(
      "patch",
      urls.widgetList(widgetsList.id),
      expect.objectContaining({
        id:      widgetsList.id,
        widgets: modified.widgets
      })
    )
  })

  it("Does not make an API call if widget list not edited", async () => {
    const { widgetsList } = setupApis({ widgets: 3 })
    renderWithProviders(
      <WidgetsList isEditing={true} widgetListId={widgetsList.id} />
    )
    // Wait for the widgets to have loaded
    const deleteBtns = await screen.findAllByRole("button", { name: /Delete/ })
    expect(deleteBtns.length).toBe(3)
    // click done without an edit
    const callCount = makeRequest.mock.calls.length
    await user.click(await screen.findByRole("button", { name: "Done" }))
    // call count should be same as before
    expect(makeRequest).toHaveBeenCalledTimes(callCount)
  })
})
