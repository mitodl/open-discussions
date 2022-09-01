import React from "react"
import { render, screen } from "@testing-library/react"
import user from "@testing-library/user-event"
import Widget, { btnLabel } from "./Widget"
import {
  makeEmbeddedUrlWidget,
  makeRichTextWidget,
  makeWidget
} from "../factories"

const queryBtn = (name: string) => screen.queryByRole("button", { name })
const getBtn = (name: string) => screen.getByRole("button", { name })

describe("Widgets", () => {
  test.each([
    { widget: makeEmbeddedUrlWidget() },
    { widget: makeRichTextWidget() }
  ])("the widgets accept classes", ({ widget }) => {
    const { container } = render(
      <Widget className="some-class other-class" widget={widget} />
    )
    // eslint-disable-next-line testing-library/no-node-access
    const widgetEl = container.firstChild
    expect(widgetEl).toHaveClass("some-class")
    expect(widgetEl).toHaveClass("other-class")
  })

  test.each([
    { widget: makeEmbeddedUrlWidget() },
    { widget: makeRichTextWidget() }
  ])("the widgets render their titles", ({ widget }) => {
    render(<Widget widget={widget} />)
    expect(screen.getByRole("heading")).toHaveTextContent(widget.title)
  })

  test.each([
    { isEditing: false },
    { isEditing: undefined },
    { isEditing: true }
  ])(
    "Always shows title in a heading (isEditing: $isEditing)",
    ({ isEditing }) => {
      const widget = makeWidget()
      render(<Widget widget={widget} isEditing={isEditing} />)
      screen.getByRole("heading", { name: widget.title })
    }
  )

  test.each([
    { isEditing: false, hasControls: false },
    { isEditing: undefined, hasControls: false },
    { isEditing: true, hasControls: true }
  ])(
    "Only shows edit, delete, drag buttons in editing mode",
    ({ isEditing, hasControls }) => {
      const widget = makeWidget()
      render(<Widget widget={widget} isEditing={isEditing} />)
      const deleteBtn = queryBtn(btnLabel.delete)
      const editBtn = queryBtn(btnLabel.edit)
      const moveBtn = queryBtn(btnLabel.move)

      expect(deleteBtn !== null).toBe(hasControls)
      expect(editBtn !== null).toBe(hasControls)
      expect(moveBtn !== null).toBe(hasControls)
    }
  )

  test.each([{ isOpen: false }, { isOpen: true }])(
    "Shows content if and only if open",
    ({ isOpen }) => {
      // Use rich text widget since easy to find its content
      const widget = makeRichTextWidget()
      render(<Widget widget={widget} isOpen={isOpen} isEditing={true} />)
      const content = screen.queryByText(widget.configuration.source)
      expect(content !== null).toBe(isOpen)
    }
  )

  test.each([
    { isOpen: false, canHide: false, canShow: true },
    { isOpen: true, canHide: true, canShow: false }
  ])(
    "Shows collapse/expand buttons appropriately (case: isOpen=$isOpen)",
    ({ isOpen, canHide, canShow }) => {
      // Use rich text widget since easy to find its content
      const widget = makeRichTextWidget()
      render(<Widget widget={widget} isOpen={isOpen} isEditing={true} />)
      const collapse = queryBtn(btnLabel.collapse)
      const expand = queryBtn(btnLabel.expand)

      expect(collapse !== null).toBe(canHide)
      expect(expand !== null).toBe(canShow)
    }
  )

  it.each([
    {
      handler: "onVisibilityChange" as const,
      name:    btnLabel.collapse,
      isOpen:  true
    },
    {
      handler: "onVisibilityChange" as const,
      name:    btnLabel.expand,
      isOpen:  false
    },
    { handler: "onEdit" as const, name: btnLabel.edit },
    { handler: "onDelete" as const, name: btnLabel.delete }
  ])("Calls $handler with widget", async ({ name, isOpen, handler }) => {
    const handlers = {
      onVisibilityChange: jest.fn(),
      onEdit:             jest.fn(),
      onDelete:           jest.fn()
    }
    const widget = makeRichTextWidget()
    render(
      <Widget widget={widget} isOpen={isOpen} isEditing={true} {...handlers} />
    )

    await user.click(getBtn(name))
    expect(handlers[handler]).toHaveBeenCalledWith(widget)
  })
})
