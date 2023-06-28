import React from "react"
import { renderWithProviders, screen, user } from "../test-utils"
import ForbiddenPage from "./ForbiddenPage"
import HomePage from "./HomePage"

const returnHome = jest.mocked(HomePage)

test("The ForbiddenPage loads with meta", async () => {
  renderWithProviders(<ForbiddenPage />, {})
  const meta = document.querySelector('[name="robots"]')
  expect(meta).toBeInTheDocument()
})

test("The ForbiddenPage loads with Correct Title", async () => {
  renderWithProviders(<ForbiddenPage />, {})
  screen.getByRole("heading", { name: "403 Forbidden Error" })
})

test("The ForbiddenPage loads with a link that directs to HomePage", async () => {
  renderWithProviders(<ForbiddenPage />, {})
  const homeButton = screen.getByRole("link", { name: "Return Home" })
  await user.click(homeButton)
  expect(returnHome).toHaveBeenCalled()
})
