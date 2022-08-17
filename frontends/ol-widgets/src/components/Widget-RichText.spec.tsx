import React from "react"
import { render, screen } from "@testing-library/react"
import Widget from "./Widget"
import { makeRichTextWidget } from "../factories"

describe("Widget-RichText", () => {
  test("it accepts classes", () => {
    const widget = makeRichTextWidget()
    const { container } = render(
      <Widget className="some-class other-class" widget={widget} />
    )
    expect(container.firstChild).toHaveClass("some-class")
    expect(container.firstChild).toHaveClass("other-class")
  })

  test("it renders title classes", () => {
    const widget = makeRichTextWidget()
    render(<Widget widget={widget} />)
    expect(screen.getByRole("heading")).toHaveTextContent(widget.title)
  })

  test("it renders plaintext content", () => {
    const widget = makeRichTextWidget()
    render(<Widget widget={widget} />)
    screen.getByText(widget.configuration.source)
  })
})
