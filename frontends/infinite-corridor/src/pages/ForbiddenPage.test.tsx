import React from "react"
import { renderWithProviders, screen, user } from "../test-utils"
import ForbiddenPage from "./ForbiddenPage"
import HomePage from "./HomePage"

test("The ForbiddenPage loads with meta", async () => {
  renderWithProviders(<ForbiddenPage />, {})
  const meta = document.querySelector('meta[name="robots"]')
  expect(meta).toBeInTheDocument()
})

test("The ForbiddenPage loads with Correct Title", async () => {
  renderWithProviders(<ForbiddenPage />, {})
  screen.getByRole("heading", { name: "403 Forbidden Error" })
})

test("The ForbiddenPage loads with a button that directs to HomePage", async () => {
  renderWithProviders(<ForbiddenPage />, {})
  const homeButton = screen.getByRole("button", { name: "Return Home" })
  await user.click(homeButton)
  expect(HomePage).toHaveBeenCalled()
})
