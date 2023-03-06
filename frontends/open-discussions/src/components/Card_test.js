import React from "react"
import { render } from "@testing-library/react"
import Card from "./Card"
import { assert } from "chai"

describe("Card component", () => {
  it("should render children", () => {
    const { container } = render(
      <Card>
        <div className="child">HEY</div>
      </Card>
    )

    const children = container.querySelectorAll(".child")
    assert.equal(children.length, 1)
    assert.ok(container.textContent.includes("HEY"))
  })

  it("should put className, if passed one", () => {
    const { container } = render(<Card className="hey there">Foo</Card>)
    const card = container.firstChild
    assert.ok(card.classList.contains("hey"))
    assert.ok(card.classList.contains("there"))
  })

  it("should display a title, if passed one", () => {
    const { container } = render(<Card title="HEY THERE">Foo</Card>)
    assert.ok(container.textContent.includes("HEY THERE"))
  })

  it("should add .borderless if given the prop", () => {
    const { container } = render(<Card borderless>Foo</Card>)
    const card = container.firstChild
    assert.ok(card.classList.contains("borderless"))
  })

  it("should add .persistent-shadow if given the prop", () => {
    const { container } = render(<Card persistentShadow>Foo</Card>)
    const card = container.firstChild
    assert.ok(card.classList.contains("persistent-shadow"))
  })
})
