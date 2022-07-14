// @flow
import React from "react"
import { render } from "@testing-library/react"
import { Card } from "ol-util"

describe("Card component", () => {
  it("should render children", () => {
    const { container } = render(
      <Card>
        <div className="child">HEY</div>
      </Card>
    )

    const children = container.querySelectorAll(".child")
    expect(children).toHaveLength(1)
    expect(container).toHaveTextContent("HEY")
  })

  it("should put className, if passed one", () => {
    const { container } = render(<Card className="hey there">Foo</Card>)
    const card = container.firstChild
    expect(card).toHaveClass("hey")
    expect(card).toHaveClass("there")
  })

  it("should display a title, if passed one", () => {
    const { container } = render(<Card title="HEY THERE">Foo</Card>)
    expect(container).toHaveTextContent("HEY THERE")
  })

  it("should add .borderless if given the prop", () => {
    const { container } = render(<Card borderless>Foo</Card>)
    const card = container.firstChild
    expect(card).toHaveClass("borderless")
  })

  it("should add .persistent-shadow if given the prop", () => {
    const { container } = render(<Card persistentShadow>Foo</Card>)
    const card = container.firstChild
    expect(card).toHaveClass("persistent-shadow")
  })
})
