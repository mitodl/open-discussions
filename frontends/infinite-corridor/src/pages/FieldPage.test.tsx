import { renderTestApp, screen } from "../test-utils"

describe("FieldPage", () => {
  it("Displays the field name", async () => {
    renderTestApp({ url: "/fields/physics" })
    const heading = screen.getByRole("heading")
    expect(heading).toHaveTextContent("physics")
  })
})