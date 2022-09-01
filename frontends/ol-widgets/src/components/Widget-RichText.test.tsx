/* eslint-disable testing-library/no-node-access */
import React from "react"
import { render, screen } from "@testing-library/react"
import Widget from "./Widget"
import { makeRichTextWidget } from "../factories"
import { html_beautify as htmlBeautify } from "js-beautify"
import { assertInstanceOf } from "ol-util"

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

  test("it renders markdown as expected", () => {
    const md = `
Let's try some markdown. Here is an unordered list:
- this item has *some italic* text
- and this one has **some bold** text

and here is another unordered list
* this item [has a link](https://mit.edu)
* and an autolink: https://npr.org

and an ordered list for fun:
1. item one
2. item two 

In the past we've had issues with erroneous links.
See https://github.com/remarkjs/react-markdown/issues/115.
This appears to no longer be a problem:

This is [not] a link. Also [[not]] a link.
`
    const expectedHtml = htmlBeautify(`
    <p>Let's try some markdown. Here is an unordered list:</p>
    <ul>
        <li>this item has <em>some italic</em> text</li>
        <li>and this one has <strong>some bold</strong> text</li>
    </ul>
    <p>and here is another unordered list</p>
    <ul>
        <li>this item <a href="https://mit.edu">has a link</a></li>
        <li>and an autolink: <a href="https://npr.org">https://npr.org</a></li>
    </ul>
    <p>and an ordered list for fun:</p>
    <ol>
        <li>item one</li>
        <li>item two</li>
    </ol>
    <p>In the past we've had issues with erroneous links.
        See <a href="https://github.com/remarkjs/react-markdown/issues/115">https://github.com/remarkjs/react-markdown/issues/115</a>.
        This appears to no longer be a problem:</p>
    <p>This is [not] a link. Also [[not]] a link.</p>
    `)

    const widget = makeRichTextWidget({ configuration: { source: md } })
    const { container } = render(
      <Widget contentClassName="widget-content" widget={widget} />
    )
    // eslint-disable-next-line testing-library/no-container
    const widgetContent = container.querySelector(".widget-content")
    assertInstanceOf(widgetContent, HTMLElement)
    expect(htmlBeautify(widgetContent.innerHTML)).toBe(expectedHtml)
  })
})
