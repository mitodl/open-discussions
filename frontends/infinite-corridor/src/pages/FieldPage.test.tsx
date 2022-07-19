import { renderTestApp, screen } from "../test-utils"

describe("FieldPage", () => {
  it("Displays the field name", async () => {
    renderTestApp({ url: "/fields/physics" })
    // When we make a real field landing page, change this to field.title
    // and use getByText instead of getAll...
    screen.getAllByText("physics")
  })
})
