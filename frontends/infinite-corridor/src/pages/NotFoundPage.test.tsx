import React from "react"
import { renderWithProviders, screen } from "../test-utils"
import NotFoundPage from "./NotFoundPage"

test("The NotFoundPage loads with meta", () => {
  renderWithProviders(<NotFoundPage />, {})
  const meta = document.querySelector('[name="robots"]')
  expect(meta).toBeInTheDocument()
})

test("The NotFoundPage loads with Correct Title", () => {
  renderWithProviders(<NotFoundPage />, {})
  screen.getByRole("heading", { name: "404 Not Found Error" })
})

test("The NotFoundPage loads with a link that directs to HomePage", async () => {
  renderWithProviders(<NotFoundPage />, {})
  screen.getByRole("link", { name: "Return Home" })
})
