import React from "react"
import { render, screen } from "@testing-library/react"
import ValidationError from "./ValidationError"

describe("ValidationError", () => {
  it.each(["", undefined, null])(
    "renders nothing when message is falsey",
    message => {
      render(<ValidationError message={message} />)
      const alert = screen.queryByRole("alert")
      expect(alert).toBe(null)
    }
  )

  it("renders a div with role=alert when message is not null", () => {
    render(<ValidationError message="Oh no!" />)
    const alert = screen.getByRole("alert")

    /**
     * We shouldn't really care it's a div, but a few flow tests require it to
     * be at the moment.
     */
    expect(alert).toBeInstanceOf(HTMLDivElement)
  })
})
