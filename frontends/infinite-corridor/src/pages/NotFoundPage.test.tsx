import React from "react"
import { renderWithProviders, screen, user } from "../test-utils"
import NotFoundPage from "./NotFoundPage"
import HomePage from "./HomePage"

test("The NotFoundPage loads with meta", () => {
  renderWithProviders(<NotFoundPage />, {})
  const meta = document.querySelector('meta[name="robots"]')
  expect(meta).toBeInTheDocument()
})

test("The NotFoundPage loads with Correct Title", () => {
  renderWithProviders(<NotFoundPage />, {})
  screen.getByRole("heading", { name: "404 Resource Not Found" })
})

test("The NotFoundPage loads with a button that directs to HomePage", async () => {
  renderWithProviders(<NotFoundPage />, {})
  const homeButton = await screen.findByRole("button", { name: "Return Home" })
  await user.click(homeButton)
  expect(HomePage).toHaveBeenCalled()
})
