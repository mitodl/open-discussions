import React from "react"
import { screen, render } from "@testing-library/react"
import user from "@testing-library/user-event"
import { faker } from "@faker-js/faker"
import { assertNotNil, PartialBy } from "ol-util"
import { makeWidgetListResponse, makeWidget } from "../../factories"
import ManageWidgetDialog from "./ManageWidgetDialog"
import type { ManageWidgetDialogProps } from "./ManageWidgetDialog"
import { WidgetTypes } from "../../interfaces"

type TestProps = PartialBy<
  ManageWidgetDialogProps,
  "specs" | "onSubmit" | "onCancel" | "isOpen"
>
const setupEditingDialog = (props?: TestProps) => {
  const { available_widgets: specs } = makeWidgetListResponse()
  const spies = { onSubmit: jest.fn(), onCancel: jest.fn() }
  const widget = makeWidget(WidgetTypes.RichText)
  render(
    <ManageWidgetDialog
      isOpen={true}
      specs={specs}
      widget={widget}
      onSubmit={spies.onSubmit}
      onCancel={spies.onCancel}
      {...props}
    />
  )
  return { spies, widget, specs }
}

describe("ManageWidgetDialog (Editing)", () => {
  it.each([{ isOpen: true }, { isOpen: false }])(
    "is visible if and only if isOpen is true (isOpen=$isOpen)",
    ({ isOpen }) => {
      setupEditingDialog({ isOpen })
      expect(!!screen.queryByRole("dialog")).toBe(isOpen)
    }
  )

  it("Displays 'Edit Widget' as dialog title", () => {
    setupEditingDialog()
    screen.getByRole("heading", { name: "Edit widget" })
  })

  it("Allows editing the widget title", async () => {
    const { widget, spies } = setupEditingDialog()
    const title = screen.getByLabelText("Title")
    await user.clear(title)
    await user.click(title)
    const newTitle = faker.lorem.words()
    await user.paste(newTitle)
    await user.click(screen.getByRole("button", { name: "Submit" }))
    expect(spies.onSubmit).toHaveBeenCalledWith({
      type:   "edit",
      widget: {
        ...widget,
        title: newTitle
      }
    })
  })

  it("Displays an error with supplied class if title is empty", async () => {
    const errorClassName = faker.lorem.word()
    const { spies } = setupEditingDialog({ errorClassName })
    const title = screen.getByLabelText("Title")
    await user.clear(title)
    await user.click(screen.getByRole("button", { name: "Submit" }))
    expect(spies.onSubmit).toHaveBeenCalledTimes(0)
    const errMsg = screen.getByText("Title is required")
    expect(errMsg).toHaveClass(errorClassName)
  })

  test.each(Object.values(WidgetTypes))(
    "It renders all the fields for widget %s",
    widgetType => {
      const widget = makeWidget(widgetType)
      const { specs } = setupEditingDialog({ widget })
      const spec = specs.find(spec => spec.widget_type === widgetType)
      assertNotNil(spec)
      const fields = spec.form_spec
      expect(fields.length).toBeGreaterThan(0)
      fields.forEach(field => {
        screen.getByLabelText(field.label)
      })
    }
  )
})

const setupAddingWidget: typeof setupEditingDialog = props =>
  setupEditingDialog({ ...props, widget: null })

describe("Adding new widgets", () => {
  test("Dialog shows all widget types on first page", () => {
    const { specs } = setupAddingWidget()
    // The dialog has radio buttons for each available widget
    const radios = screen.getAllByRole("radio")
    const labels = radios.map(r => r.closest("label"))
    labels.forEach((label, i) => {
      expect(label).toHaveTextContent(specs[i].description)
    })
  })

  test("First widget type is initially chosen", () => {
    setupAddingWidget()
    const radios = screen.getAllByRole("radio")
    expect(radios[0]).toBeChecked()
  })

  it("Displays 'New widget' as dialog title", () => {
    setupAddingWidget()
    screen.getByRole("heading", { name: "New widget" })
  })

  it("Displays description of new widget as title for dialog second page", async () => {
    const { specs } = setupAddingWidget()
    await user.click(screen.getByRole("button", { name: "Next" }))
    const heading = screen.getByRole("heading")

    expect(heading).toHaveTextContent("Add new")
    expect(heading).toHaveTextContent(specs[0].description)
  })
})
