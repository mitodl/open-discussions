import React from "react"
import { waitFor } from "@testing-library/react"
import { renderWithProviders, screen } from "../test-utils"
import { HOME } from "./urls"
import ForbiddenPage from "./ForbiddenPage"

test("The ForbiddenPage loads with meta", async () => {
  renderWithProviders(<ForbiddenPage />, {})
  await waitFor(() => {
    // eslint-disable-next-line testing-library/no-node-access
    const meta = document.head.querySelector('meta[name="robots"]')
    expect(meta).toHaveProperty("content", "noindex,noarchive")
  })
})

test("The ForbiddenPage loads with Correct Title", () => {
  renderWithProviders(<ForbiddenPage />, {})
  screen.getByRole("heading", { name: "403 Forbidden Error" })
})

test("The ForbiddenPage loads with a link that directs to HomePage", () => {
  renderWithProviders(<ForbiddenPage />, {})
  const homeLink = screen.getByRole("link", { name: "Home" })
  expect(homeLink).toHaveAttribute("href", HOME)
})
