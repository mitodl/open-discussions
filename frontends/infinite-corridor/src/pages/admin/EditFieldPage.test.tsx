import { renderTestApp, screen, setMockResponse } from "../../test-utils"
import * as factory from "../../api/fields/factories"
import { urls } from "../../api/fields"

describe("EditFieldPage", () => {
  it("Displays 3 tabs for moderators", async () => {
    const field = factory.makeField({ is_moderator: true })
    setMockResponse.get(urls.fieldDetails(field.name), field)
    renderTestApp({ url: `${urls.fieldDetails(field.name)}manage/` })
    const tabs = await screen.findAllByRole("tab")
    expect(tabs.length).toEqual(3)
  })

  it("Displays message and no tabs for non-moderators", async () => {
    const field = factory.makeField({ is_moderator: false })
    setMockResponse.get(urls.fieldDetails(field.name), field)
    renderTestApp({ url: `${urls.fieldDetails(field.name)}manage/` })
    await screen.findByText("You do not have permission to access this page.")
    const tabs = screen.queryAllByRole("tab")
    expect(tabs.length).toEqual(0)
  })

  it("Displays the correct tab and form for the #appearance hash", async () => {
    const field = factory.makeField({ is_moderator: true })
    setMockResponse.get(urls.fieldDetails(field.name), field)
    renderTestApp({ url: `${urls.fieldDetails(field.name)}manage/#appearance` })
    const activeTab = await screen.findByRole("tab", { selected: true })
    expect(activeTab?.textContent).toEqual("Appearance")
    await screen.findByLabelText("Description")
  })
})
