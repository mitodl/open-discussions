import { UserList } from "ol-search-ui"
import * as factories from "ol-search-ui/src/factories"
import { urls as lrUrls } from "../../api/learning-resources"
import { DeleteListDialog } from "./ManageListDialogs"
import {
  screen,
  renderWithProviders,
  setMockResponse,
  user,
  act
} from "../../test-utils"
import { mockAxiosInstance as axios } from "../../test-utils/mockAxios"
import NiceModal from "@ebay/nice-modal-react"
import { waitForElementToBeRemoved } from "@testing-library/react"

/**
 * Helpers to find various inputs.
 *
 * E.g., `inputs.object_type[LearningResourceType.LearningPath]()` will return
 * radio button for "Learning Path".
 *
 */
const inputs = {
  cancel: () => screen.getByRole("button", { name: "Cancel" }),
  delete: () => screen.getByRole("button", { name: "Yes, delete" })
}

describe("Deleting lists", () => {
  const setup = (resourceOverrides: Partial<UserList> = {}) => {
    const resource = factories.makeUserList(resourceOverrides)
    renderWithProviders(null)
    act(() => {
      NiceModal.show(DeleteListDialog, { resource })
    })
    return { resource }
  }

  test("Deleting a userlist calls correct API", async () => {
    const { resource } = setup()

    const dialog = screen.getByRole("dialog")
    setMockResponse.delete(lrUrls.userList.details(resource.id), undefined)
    await user.click(inputs.delete())

    expect(axios.delete).toHaveBeenCalledWith(
      lrUrls.userList.details(resource.id)
    )
    await waitForElementToBeRemoved(dialog)
  })

  test("Clicking cancel does not delete list", async () => {
    setup()

    const dialog = screen.getByRole("dialog")
    await user.click(inputs.cancel())

    expect(axios.delete).not.toHaveBeenCalled()
    await waitForElementToBeRemoved(dialog)
  })
})
