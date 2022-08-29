import React from "react"
import { screen, render, within, act } from "@testing-library/react"
import user from "@testing-library/user-event"
import { faker } from "@faker-js/faker"
import { makeWidgetListResponse, makeWidget } from "../../factories"
import WidgetsListEditable from "./WidgetsListEditable"
import { btnLabel } from "../Widget"
import { WidgetTypes } from "../../interfaces"
import { assertInstanceOf, SortableList } from "ol-util"

jest.mock("ol-util", () => {
  const actual = jest.requireActual("ol-util")
  return {
    __esModule:   true,
    ...actual,
    SortableList: jest.fn(actual.SortableList)
  }
})

const queryBtn = (name: string, container: HTMLElement) =>
  within(container).queryByRole("button", { name })
const findBtn = (name: string, container: HTMLElement) =>
  within(container).findByRole("button", { name })
const getBtn = (name: string, container: HTMLElement) =>
  within(container).getByRole("button", { name })

const renderWidgetsList = () => {
  const widgets = [
    makeWidget(WidgetTypes.RichText),
    makeWidget(WidgetTypes.RichText),
    makeWidget(WidgetTypes.RichText)
  ]
  const widgetsList = makeWidgetListResponse({ widgets })
  const spies = {
    onSubmit: jest.fn(),
    onCancel: jest.fn()
  }
  const { container } = render(
    <WidgetsListEditable
      widgetClassName="test-widget"
      headerClassName="test-widget-header"
      widgetsList={widgetsList}
      {...spies}
    />
  )
  const getWidgetEls = () => {
    return Array.from(
      container.querySelectorAll(".test-widget")
    ) as HTMLElement[]
  }
  const getHeader = () => {
    const headers = container.querySelectorAll(".test-widget-header")
    if (headers.length !== 1) {
      throw new Error("Multiple headers found")
    }
    return headers.item(0) as HTMLElement
  }
  return { spies, widgets, widgetsList, getWidgetEls, getHeader }
}

describe("WidgetsListEditable", () => {
  test("Displays each widget", () => {
    const { widgets, getWidgetEls } = renderWidgetsList()
    const widgetEls = getWidgetEls()

    expect(widgets).toHaveLength(3)
    expect(widgetEls).toHaveLength(widgets.length)

    widgets.forEach((widget, i) => {
      within(widgetEls[i]).getByText(widget.title)
    })
  })

  test("Expanding and collpasing", async () => {
    const { getWidgetEls, getHeader } = renderWidgetsList()
    const i = faker.datatype.number({ min: 0, max: 2 })

    const getVisibility = () =>
      getWidgetEls().map(el => {
        const collapsible = !!queryBtn(btnLabel.collapse, el)
        const expandable = !!queryBtn(btnLabel.expand, el)
        if (collapsible && !expandable) return "expanded" as const
        if (!collapsible && expandable) return "collapsed" as const
        throw new Error("Unexpected")
      })

    expect(getVisibility()).toEqual(["collapsed", "collapsed", "collapsed"])

    const widgetEls = getWidgetEls()
    await user.click(getBtn(btnLabel.expand, widgetEls[i]))

    const expected = ["collapsed", "collapsed", "collapsed"]
    expected[i] = "expanded"
    expect(getVisibility()).toEqual(expected)

    await user.click(getBtn("Expand all", getHeader()))

    expect(getVisibility()).toEqual(["expanded", "expanded", "expanded"])

    await user.click(getBtn("Collapse all", getHeader()))

    expect(getVisibility()).toEqual(["collapsed", "collapsed", "collapsed"])
  })

  test("Deleting a widget", async () => {
    const { widgets, getWidgetEls, getHeader, spies } = renderWidgetsList()
    const i = faker.datatype.number({ min: 0, max: 2 })
    await user.click(getBtn(btnLabel.delete, getWidgetEls()[i]))
    expect(getWidgetEls().length).toBe(2)
    await user.click(getBtn("Done", getHeader()))

    expect(spies.onSubmit).toHaveBeenCalledTimes(1)
    expect(spies.onSubmit).toHaveBeenCalledWith({
      touched: true,
      widgets: widgets.filter((w, j) => j !== i)
    })
  })

  test("Clicking 'Done' without any edits calls onSubmit with touched: false", async () => {
    const { widgets, getHeader, spies } = renderWidgetsList()
    await user.click(getBtn("Done", getHeader()))
    expect(spies.onSubmit).toHaveBeenCalledTimes(1)
    expect(spies.onCancel).toHaveBeenCalledTimes(0)
    expect(spies.onSubmit).toHaveBeenCalledWith({
      touched: false,
      widgets
    })
  })

  test("Clicking 'Cancel' calls onCancel not onSubmit", async () => {
    const { getHeader, spies } = renderWidgetsList()
    await user.click(getBtn("Cancel", getHeader()))
    expect(spies.onSubmit).toHaveBeenCalledTimes(0)
    expect(spies.onCancel).toHaveBeenCalledTimes(1)
  })

  /**
   * Goal here is to test that when adding a widget:
   *  - dialog form opens
   *  - WidgetsListEditable UI updates correctly after dialog form submission
   *  - WidgetsListEditable calls `onSubmit` with updated widgets
   * Fine-grained testing of the dialog is done in its own suite.
   */
  test("Adding a widget", async () => {
    const { widgets, getHeader, spies, widgetsList } = renderWidgetsList()
    await user.click(getBtn("Add widget", getHeader()))

    // There is a dialog
    const dialog = screen.getByRole("dialog")
    expect(dialog).toHaveTextContent("New widget")

    // The dialog has radio buttons for each available widget
    const radios = within(dialog).getAllByRole("radio")
    const labels = radios.map(r => r.closest("label"))
    labels.forEach((label, i) => {
      const spec = widgetsList.available_widgets[i]
      expect(label).toHaveTextContent(spec.description)
    })

    // Click Next
    await user.click(getBtn("Next", dialog))

    // Paste in a new title
    const title = within(dialog).getByLabelText("Title")
    await user.click(title)
    await user.clear(title)
    await user.paste("Cool new title")

    await user.click(getBtn("Submit", dialog))

    await user.click(await findBtn("Done", getHeader()))
    expect(spies.onSubmit).toHaveBeenCalledWith({
      touched: true,
      widgets: [
        expect.objectContaining({
          title: "Cool new title",
          id:    null
        }),
        ...widgets
      ]
    })
  })

  /**
   * Goal here is to test that when updating a widget:
   *  - dialog form opens
   *  - WidgetsListEditable UI updates correctly after dialog form submission
   *  - WidgetsListEditable calls `onSubmit` with updated widgets
   * Fine-grained testing of the dialog is done in its own suite.
   */
  test("Updating a widget", async () => {
    const { widgets, getWidgetEls, getHeader, spies } = renderWidgetsList()
    const i = faker.datatype.number({ min: 0, max: 2 })
    await user.click(getBtn(btnLabel.edit, getWidgetEls()[i]))

    // There is a dialog
    const dialog = screen.getByRole("dialog")
    expect(dialog).toHaveTextContent("Edit widget")

    // The dialog form has data for the clicked widget
    const title = within(dialog).getByLabelText("Title")
    assertInstanceOf(title, HTMLInputElement)
    expect(title.value).toBe(widgets[i].title)

    // Paste new value and submit
    const newTitle = "Cool edited title"
    await user.clear(title)
    await user.paste(newTitle)
    await user.click(getBtn("Submit", dialog))
    await user.click(await findBtn("Done", getHeader()))

    await within(getWidgetEls()[i]).findByText(newTitle)

    const expectedWidgets = [...widgets]
    expectedWidgets[i] = {
      ...widgets[i],
      title: "Cool edited title"
    }
    expect(spies.onSubmit).toHaveBeenCalledWith({
      touched: true,
      widgets: expectedWidgets
    })
  })

  test("Updating a widget's order", async () => {
    const spySortableList = jest.mocked(SortableList)
    const { widgets, getHeader, spies } = renderWidgetsList()
    const [w1, w2, w3] = widgets

    const { onSortEnd, itemIds } = spySortableList.mock.lastCall[0]
    // Note that these are the wrapper ids not the widget ids
    const [id1, id2, id3] = itemIds
    const newOrder = [id2, id1, id3]
    act(() => onSortEnd({ itemIds: newOrder }))

    await user.click(await findBtn("Done", getHeader()))
    expect(spies.onSubmit).toHaveBeenCalledWith({
      touched: true,
      widgets: [w2, w1, w3]
    })
  })
})
