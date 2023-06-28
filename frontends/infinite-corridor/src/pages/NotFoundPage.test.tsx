import React from "react"
import { waitFor } from "@testing-library/react"
import { renderWithProviders, screen } from "../test-utils"
import { HOME } from "./urls"
import NotFoundPage from "./NotFoundPage"

test("The NotFoundPage loads with meta", async () => {
  renderWithProviders(<NotFoundPage />, {})
  await waitFor(() => {
    // eslint-disable-next-line testing-library/no-node-access
    const meta = document.head.querySelector('meta[name="robots"]')
    expect(meta).toHaveProperty("content", "noindex,noarchive")
  })
})

test("The NotFoundPage loads with Correct Title", () => {
  renderWithProviders(<NotFoundPage />, {})
  screen.getByRole("heading", { name: "404 Not Found Error" })
})

test("The NotFoundPage loads with a link that directs to HomePage", () => {
  renderWithProviders(<NotFoundPage />, {})
  const homeLink = screen.getByRole("link", { name: "Home" })
  expect(homeLink).toHaveAttribute("href", HOME)
})
