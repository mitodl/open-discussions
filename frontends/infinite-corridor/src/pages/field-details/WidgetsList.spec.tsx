import React from "react"
import {
  renderWithProviders,
  screen,
  waitFor,
  expectProps
} from "../../test-utils"
import { Widget, makeWidgetListResponse } from "ol-widgets"
import WidgetsList from "./WidgetsList"
import { setMockResponse } from "../../test-utils"
import { urls } from "../../api/widgets"

jest.mock("ol-widgets", () => {
  const actual = jest.requireActual("ol-widgets")
  return {
    __esModule: true,
    ...actual,
    Widget:     jest.fn(() => <div>WidgetInstance</div>)
  }
})
const mockWidget = jest.mocked(Widget)

const setupApis = ({ widgets = 3 } = {}) => {
  const widgetList = makeWidgetListResponse({}, { count: widgets })
  setMockResponse.get(urls.widgetList(widgetList.id), widgetList)
  return { widgetList }
}

describe("WidgetsList", () => {
  test("Renders widgets", async () => {
    const { widgetList } = setupApis({ widgets: 3 })
    const widgetsCount = widgetList.widgets.length
    renderWithProviders(
      <WidgetsList isEditing={false} widgetListId={widgetList.id} />
    )

    /**
     * Check that (mock) widget components are on-screen
     */
    await waitFor(() => {
      expect(screen.getAllByText("WidgetInstance")).toHaveLength(widgetsCount)
    })

    /**
     * Check that the Widget component was called with correct props
     */
    expectProps(mockWidget, { widget: widgetList.widgets.at(-1) }, -1)
    expectProps(mockWidget, { widget: widgetList.widgets.at(-2) }, -2)
    expectProps(mockWidget, { widget: widgetList.widgets.at(-3) }, -3)
  })
})
