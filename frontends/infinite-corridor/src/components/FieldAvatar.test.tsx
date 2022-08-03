import React from "react"
import { render, screen } from "@testing-library/react"

import { makeField } from "../api/fields/factories"
import FieldAvatar from "./FieldAvatar"

describe("Avatar", () => {
  it("Displays a small avatar image for the field", async () => {
    const field = makeField()
    render(<FieldAvatar field={field} imageSize="small" />)
    const img = screen.getByRole("img")
    expect(img.getAttribute("alt")).toBe("") // should be empty unless meaningful
    expect(img.getAttribute("src")).toEqual(field.avatar_small)
  })
  it("Displays a medium avatar image by default", async () => {
    const field = makeField()
    render(<FieldAvatar field={field} />)
    const img = screen.getByRole("img")
    expect(img.getAttribute("alt")).toBe("") // should be empty unless meaningful
    expect(img.getAttribute("src")).toEqual(field.avatar_medium)
  })
  it("Displays initials if no avatar image exists", async () => {
    const field = makeField({
      title:         "Test Title",
      avatar:        null,
      avatar_small:  null,
      avatar_medium: null
    })
    render(<FieldAvatar field={field} />)
    const img = screen.queryByRole("img")
    expect(img).toBeNull()
    await screen.findByText("TT")
  })
})
