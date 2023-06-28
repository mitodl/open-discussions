import React from "react"
import { renderWithProviders, screen } from "../test-utils"
import ForbiddenPage from "./ForbiddenPage"
import { waitFor } from "@testing-library/react"

test("The ForbiddenPage loads with meta", async () => {
  renderWithProviders(<ForbiddenPage />, {})
  await waitFor(() => {
    // eslint-disable-next-line testing-library/no-node-access
    const meta = document.querySelector('[name="robots"]')
    expect(meta).toBeInTheDocument()
  })
})

test("The ForbiddenPage loads with Correct Title", () => {
  renderWithProviders(<ForbiddenPage />, {})
  screen.getByRole("heading", { name: "403 Forbidden Error" })
})

test("The ForbiddenPage loads with a link that directs to HomePage", () => {
  renderWithProviders(<ForbiddenPage />, {})
  screen.getByRole("link", { name: "Return Home" })
})
