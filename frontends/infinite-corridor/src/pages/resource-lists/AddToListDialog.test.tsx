import { faker } from "@faker-js/faker"
import {
  makeCourse,
  makeUserListsPaginated,
  makeListItemMember,
  makeStaffListsPaginated
} from "ol-search-ui/src/factories"
import { UserList, LearningResource, StaffList } from "ol-search-ui"
import { assertNotNil } from "ol-util"

import * as NiceModal from "@ebay/nice-modal-react"
import AddToListDialog from "./AddToListDialog"
import {
  renderWithProviders,
  screen,
  user,
  within,
  act
} from "../../test-utils"
import {
  setMockResponse,
  mockAxiosInstance as axios
} from "../../test-utils/mockAxios"
import { urls } from "../../api/learning-resources"
import { manageListDialogs } from "./ManageListDialogs"
import { waitForElementToBeRemoved } from "@testing-library/react"

jest.mock("@ebay/nice-modal-react", () => {
  const actual = jest.requireActual("@ebay/nice-modal-react")
  return {
    ...actual,
    show: jest.fn(actual.show)
  }
})

type SetupOptions = {
  inLists: number[]
  isFavorite: boolean
  dialogOpen: boolean
}
const setup = (
  mode: "userlist" | "stafflist",
  {
    inLists = [],
    isFavorite = false,
    dialogOpen = true
  }: Partial<SetupOptions> = {}
) => {
  const resource = makeCourse({ is_favorite: isFavorite })
  const paginatedLists =
    mode === "userlist" ?
      makeUserListsPaginated({ count: 3 }) :
      makeStaffListsPaginated({ count: 3 })
  const lists = paginatedLists.results

  const itemMembers = mode === "userlist" ? resource.lists : resource.stafflists

  inLists.forEach(index => {
    const list = lists[index]
    itemMembers.push(makeListItemMember({}, { resource, list }))
    list.item_count += 1
  })

  setMockResponse.get(
    urls.resource.details(resource.object_type, resource.id),
    resource
  )
  const listingUrl =
    mode === "userlist" ? urls.userList.listing() : urls.staffList.listing()
  setMockResponse.get(listingUrl, paginatedLists)

  const view = renderWithProviders(null)

  if (dialogOpen) {
    act(() => {
      NiceModal.show(AddToListDialog, { resourceKey: resource, mode })
    })
  }

  return {
    view,
    resource,
    lists,
    itemMembers
  }
}

const addToList = (
  resource: LearningResource,
  list: UserList | StaffList,
  mode: "userlist" | "stafflist"
): LearningResource => {
  const member = makeListItemMember({}, { resource, list })
  const patch =
    mode === "userlist" ?
      {
        lists: [...resource.lists, member]
      } :
      {
        stafflists: [...resource.stafflists, member]
      }
  return { ...resource, ...patch }
}
const removeFromList = (
  resource: LearningResource,
  list: UserList | StaffList
): LearningResource => {
  return {
    ...resource,
    lists:      resource.lists.filter(member => member.list_id !== list.id),
    stafflists: resource.lists.filter(member => member.list_id !== list.id)
  }
}

describe.each([
  { mode: "userlist", listUrls: urls.userList, liOffset: 1 },
  { mode: "stafflist", listUrls: urls.staffList, liOffset: 0 }
] as const)("AddToListDialog (mode=$mode)", ({ mode, listUrls, liOffset }) => {
  test("List is checked iff resource is in list", async () => {
    const index = faker.datatype.number({ min: 0, max: 2 })
    setup(mode, { inLists: [index] })

    const checkboxes = await screen.findAllByRole<HTMLInputElement>("checkbox")
    const relevantCheckboxes = checkboxes.slice(liOffset)
    expect(relevantCheckboxes[0].checked).toBe(index === 0)
    expect(relevantCheckboxes[1].checked).toBe(index === 1)
    expect(relevantCheckboxes[2].checked).toBe(index === 2)
  })

  test("Clicking an unchecked list adds item to that list", async () => {
    const { resource, lists } = setup(mode)
    const list = faker.helpers.arrayElement(lists as (StaffList | UserList)[])

    const addToListUrl = listUrls.itemAdd(list.id)
    const modifiedResource = addToList(resource, list, mode)
    setMockResponse.post(addToListUrl, {
      content_data: modifiedResource
    })
    setMockResponse.get(
      urls.resource.details(resource.object_type, resource.id),
      modifiedResource
    )

    const listButton = await screen.findByRole("button", { name: list.title })
    const checkbox = within(listButton).getByRole<HTMLInputElement>("checkbox")

    expect(checkbox.checked).toBe(false)
    await user.click(listButton)
    expect(checkbox.checked).toBe(true)

    expect(axios.post).toHaveBeenCalledWith(addToListUrl, {
      content_type: resource.object_type,
      object_id:    resource.id
    })
  })

  test("Clicking a checked list removes item from that list", async () => {
    const index = faker.datatype.number({ min: 0, max: 2 })
    const { resource, lists, itemMembers } = setup(mode, { inLists: [index] })
    const list = lists[index]
    const listItem = itemMembers.find(l => l.list_id === list.id)
    assertNotNil(listItem)

    const removalUrl = listUrls.itemDetails(list.id, listItem.item_id)
    setMockResponse.delete(removalUrl)
    setMockResponse.get(
      urls.resource.details(resource.object_type, resource.id),
      removeFromList(resource, list)
    )

    const listButton = await screen.findByRole("button", { name: list.title })
    const checkbox = within(listButton).getByRole<HTMLInputElement>("checkbox")

    expect(checkbox.checked).toBe(true)
    await user.click(listButton)
    expect(checkbox.checked).toBe(false)

    expect(axios.delete).toHaveBeenCalledWith(removalUrl)
  })

  test("Clicking 'Create a new list' opens the create list dialog", async () => {
    // Don't actually open the 'Create List' modal, or we'll need to mock API responses.
    const createList = jest
      .spyOn(manageListDialogs, "createList")
      .mockImplementationOnce(jest.fn())

    setup(mode)
    const button = await screen.findByRole("button", {
      name: "Create a new list"
    })

    expect(createList).not.toHaveBeenCalled()
    await user.click(button)
    expect(createList).toHaveBeenCalledWith(mode)
  })

  test("Opens and closes via NiceModal", async () => {
    const { resource: resource1 } = setup(mode)
    const dialog1 = await screen.findByRole("dialog")
    await within(dialog1).findByText(resource1.title, { exact: false })

    // Close the dialog
    act(() => {
      NiceModal.hide(AddToListDialog)
    })
    await waitForElementToBeRemoved(dialog1)

    // Open it with a new resource
    const resource2 = makeCourse()
    setMockResponse.get(
      urls.resource.details(resource2.object_type, resource2.id),
      resource2
    )
    act(() => {
      NiceModal.show(AddToListDialog, { resourceKey: resource2, mode })
    })
    const dialog2 = await screen.findByRole("dialog")
    await within(dialog2).findByText(resource2.title, { exact: false })
  })
})

describe("Favorites within AddToListDialog", () => {
  test("In mode=userlist, shows a list of 'Favorites' and lists", async () => {
    const { lists } = setup("userlist")
    const li = await screen.findAllByRole("listitem")
    expect(li).toHaveLength(5)
    within(li[0]).getByRole("button", { name: "Favorites" })
    within(li[1]).getByRole("button", { name: lists[0].title })
    within(li[2]).getByRole("button", { name: lists[1].title })
    within(li[3]).getByRole("button", { name: lists[2].title })
    within(li[4]).getByRole("button", { name: "Create a new list" })
  })

  test("In mode=stafflist, shows lists but NOT 'favorites'", async () => {
    const { lists } = setup("stafflist")
    const li = await screen.findAllByRole("listitem")
    expect(li).toHaveLength(4)
    within(li[0]).getByRole("button", { name: lists[0].title })
    within(li[1]).getByRole("button", { name: lists[1].title })
    within(li[2]).getByRole("button", { name: lists[2].title })
    within(li[3]).getByRole("button", { name: "Create a new list" })
    expect(screen.queryByText("Favorites")).toBe(null)
  })

  test.each([
    { isFavorite: true, adverb: "" },
    { isFavorite: false, adverb: "not" }
  ])(
    "Favorites is $adverb checked when resource.is_favorite=$isFavorite",
    async ({ isFavorite }) => {
      setup("userlist", { isFavorite })
      const favoritesButton = await screen.findByRole("button", {
        name: "Favorites"
      })
      const checkbox =
        within(favoritesButton).getByRole<HTMLInputElement>("checkbox")
      expect(checkbox.checked).toBe(isFavorite)
    }
  )

  test.each([
    {
      isFavorite: true,
      desc:       "removes already-favorited item from favorites",
      url:        urls.resource.unfavorite
    },
    {
      isFavorite: false,
      desc:       "adds not-favorited item to favorites",
      url:        urls.resource.favorite
    }
  ])("Clicking 'Favorites' $desc", async ({ isFavorite, url }) => {
    const { resource } = setup("userlist", { isFavorite })

    setMockResponse.post(url(resource.object_type, resource.id))
    setMockResponse.get(
      urls.resource.details(resource.object_type, resource.id),
      { ...resource, is_favorite: !isFavorite }
    )

    const favButton = await screen.findByRole("button", { name: "Favorites" })
    const checkbox = within(favButton).getByRole<HTMLInputElement>("checkbox")

    expect(checkbox.checked).toBe(isFavorite)
    await user.click(favButton)
    expect(checkbox.checked).toBe(!isFavorite)
  })
})
