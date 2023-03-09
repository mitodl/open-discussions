import React from "react"
import { render, screen } from "@testing-library/react"
import ValidationError from "./ValidationError"
import { assert } from "chai"

describe("ValidationError", () => {
  const falsyCases = ["", undefined, null]
  falsyCases.forEach(falsyCase => {
    it(`renders nothing when message is ${falsyCase}`, () => {
      render(<ValidationError message={falsyCase} />)
      const alert = screen.queryByRole("alert")
      assert.equal(alert, null)
    })
  })

  it("renders a div with role=alert and class validation-error when message is not null", () => {
    render(<ValidationError message="Oh no!" />)
    const alert = screen.getByRole("alert")

    /**
     * We shouldn't really care it's a div, but a few flow tests require it to
     * be at the moment.
     */
    assert.instanceOf(alert, HTMLDivElement)
    assert.ok(alert.classList.contains("validation-error"))
  })
})
