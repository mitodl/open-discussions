import React from "react"
import { screen, render, waitFor } from "@testing-library/react"
import user from "@testing-library/user-event"
import { faker } from "@faker-js/faker/locale/en"
import { assertNotNil, PartialBy } from "ol-util"
import { makeWidgetListResponse, makeWidget } from "../../factories"
import ManageWidgetDialog from "./ManageWidgetDialog"
import type { ManageWidgetDialogProps } from "./ManageWidgetDialog"
import { WidgetTypes } from "../../interfaces"

type TestProps = PartialBy<
  ManageWidgetDialogProps,
  "specs" | "onSubmit" | "onCancel" | "isOpen"
>
const setupEditingDialog = async (props?: TestProps) => {
  const { available_widgets: specs } = makeWidgetListResponse()
  const spies = { onSubmit: jest.fn(), onCancel: jest.fn() }
  const widget = props?.widget ?? makeWidget(WidgetTypes.RichText)
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
  await waitFor(() => {
    expect(screen.queryByLabelText("Loading")).toBe(null)
  })
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

  it("Displays 'Edit Widget' as dialog title", async () => {
    await setupEditingDialog()
    screen.getByRole("heading", { name: "Edit widget" })
  })

  it("Allows editing the widget title", async () => {
    const { widget, spies } = await setupEditingDialog()
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
    const classes = { error: faker.lorem.word() }
    const { spies } = await setupEditingDialog({ classes })
    const title = screen.getByLabelText("Title")
    await user.clear(title)
    await user.click(screen.getByRole("button", { name: "Submit" }))
    expect(spies.onSubmit).toHaveBeenCalledTimes(0)
    const errMsg = screen.getByText("Title is required")
    expect(errMsg).toHaveClass(classes.error)
  })

  it("passes classes to relevant elements", async () => {
    const fakerClassName = () => faker.unique(faker.lorem.slug)
    const classes = {
      label:      fakerClassName(),
      field:      fakerClassName(),
      fieldGroup: fakerClassName(),
      dialog:     fakerClassName()
    }
    await setupEditingDialog({ classes })
    // eslint-disable-next-line testing-library/no-node-access
    const dialog = document.querySelector(`.${classes.dialog}`) as HTMLElement
    // eslint-disable-next-line testing-library/no-node-access
    const labels = dialog.querySelectorAll("label")
    // eslint-disable-next-line testing-library/no-node-access
    const inputs = dialog.querySelectorAll("input, textarea")
    // eslint-disable-next-line testing-library/no-node-access
    const groups = dialog.querySelectorAll(`.${classes.fieldGroup}`)

    expect(dialog).toHaveClass(classes.dialog)

    expect(labels).toHaveLength(2)
    expect(labels[0]).toHaveClass(classes.label)
    expect(labels[1]).toHaveClass(classes.label)

    expect(inputs).toHaveLength(2)
    expect(inputs[0]).toHaveClass(classes.field)
    expect(inputs[1]).toHaveClass(classes.field)

    expect(groups).toHaveLength(2)
  })

  test.each(Object.values(WidgetTypes))(
    "It renders all the fields for widget %s",
    async widgetType => {
      const widget = makeWidget(widgetType)
      const { specs } = await setupEditingDialog({ widget })
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
  test("Dialog shows all widget types on first page", async () => {
    const { specs } = await setupAddingWidget()
    // The dialog has radio buttons for each available widget
    const radios = screen.getAllByRole("radio")
    // eslint-disable-next-line testing-library/no-node-access
    const labels = radios.map(r => r.closest("label"))
    labels.forEach((label, i) => {
      expect(label).toHaveTextContent(specs[i].description)
    })
  })

  test("First widget type is initially chosen", async () => {
    await setupAddingWidget()
    const radios = screen.getAllByRole("radio")
    expect(radios[0]).toBeChecked()
  })

  it("Displays 'New widget' as dialog title", async () => {
    await setupAddingWidget()
    screen.getByRole("heading", { name: "New widget" })
  })

  it("Displays description of new widget as title for dialog second page", async () => {
    const { specs } = await setupAddingWidget()
    await user.click(screen.getByRole("button", { name: "Next" }))
    const heading = screen.getByRole("heading")

    expect(heading).toHaveTextContent("Add new")
    expect(heading).toHaveTextContent(specs[0].description)
  })
})
