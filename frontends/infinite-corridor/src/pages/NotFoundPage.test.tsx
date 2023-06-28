import React from "react"
import { renderWithProviders, screen, user } from "../test-utils"
import NotFoundPage from "./NotFoundPage"
import HomePage from "./HomePage"

const returnHome = jest.mocked(HomePage)

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
  const homeButton = await screen.findByRole("link", { name: "Return Home" })
  await user.click(homeButton)
  expect(returnHome).toHaveBeenCalled()
})
