import React from "react"
import { faker } from "@faker-js/faker"
import {
  makeCourse,
  makeUserListsPaginated,
  makeListItemMember
} from "ol-search-ui/build/factories"
import { UserList, LearningResource } from "ol-search-ui"
import { assertNotNil } from "ol-util"

import AddToListDialog from "./AddToListDialog"
import {
  expectProps,
  renderWithProviders,
  screen,
  user,
  within
} from "../../test-utils"
import {
  setMockResponse,
  mockAxiosInstance as axios
} from "../../test-utils/mockAxios"
import { urls } from "../../api/learning-resources"
import { CreateListDialog } from "./ManageListDialogs"

jest.mock("./ManageListDialogs", () => {
  const actual = jest.requireActual("./ManageListDialogs")
  return {
    ...actual,
    CreateListDialog: jest.fn(() => <div role="dialog">Create new list</div>)
  }
})

const spyCreateListDialog = jest.mocked(CreateListDialog)

type SetupOptions = {
  inLists: number[]
  isFavorite: boolean
  dialogOpen: boolean
}
const setup = ({
  inLists = [],
  isFavorite = false,
  dialogOpen = true
}: Partial<SetupOptions> = {}) => {
  const resource = makeCourse({ is_favorite: isFavorite })
  const paginatedLists = makeUserListsPaginated(3)
  const lists = paginatedLists.results

  inLists.forEach(index => {
    const list = lists[index]
    resource.lists.push(makeListItemMember({}, { resource, userList: list }))
    list.item_count += 1
  })

  setMockResponse.get(
    urls.resource.details(resource.object_type, resource.id),
    resource
  )
  setMockResponse.get(urls.userList.listing(), paginatedLists)

  const onClose = jest.fn()
  const view = renderWithProviders(
    <AddToListDialog
      onClose={onClose}
      open={dialogOpen}
      resourceKey={resource}
    />
  )
  return {
    view,
    onClose,
    resource,
    lists
  }
}

const addToList = (
  resource: LearningResource,
  list: UserList
): LearningResource => {
  const member = makeListItemMember({}, { resource, userList: list })
  return { ...resource, lists: [...resource.lists, member] }
}
const removeFromList = (
  resource: LearningResource,
  list: UserList
): LearningResource => {
  return {
    ...resource,
    lists: resource.lists.filter(member => member.list_id !== list.id)
  }
}

describe("AddToListDialog", () => {
  test("Shows a list of 'Favorites' and userLists", async () => {
    const { lists } = setup()
    const li = await screen.findAllByRole("listitem")
    expect(li).toHaveLength(5)
    within(li[0]).getByRole("button", { name: "Favorites" })
    within(li[1]).getByRole("button", { name: lists[0].title })
    within(li[2]).getByRole("button", { name: lists[1].title })
    within(li[3]).getByRole("button", { name: lists[2].title })
    within(li[4]).getByRole("button", { name: "Create a new list" })
  })

  test("UserList is checked iff resource is in list", async () => {
    const index = faker.datatype.number({ min: 0, max: 2 })
    setup({ inLists: [index] })

    const [favoritesCheckbox, ...listCheckboxes] =
      await screen.findAllByRole<HTMLInputElement>("checkbox")

    expect(favoritesCheckbox.checked).toBe(false)
    expect(listCheckboxes[0].checked).toBe(index === 0)
    expect(listCheckboxes[1].checked).toBe(index === 1)
    expect(listCheckboxes[2].checked).toBe(index === 2)
  })

  test.each([
    { isFavorite: true, adverb: "" },
    { isFavorite: false, adverb: "not" }
  ])(
    "Favorites is $adverb checked when resource.is_favorite=$isFavorite",
    async ({ isFavorite }) => {
      setup({ isFavorite })
      const favoritesButton = await screen.findByRole("button", {
        name: "Favorites"
      })
      const checkbox =
        within(favoritesButton).getByRole<HTMLInputElement>("checkbox")
      expect(checkbox.checked).toBe(isFavorite)
    }
  )

  test("Clicking an unchecked list adds item to that list", async () => {
    const { resource, lists } = setup()
    const list = faker.helpers.arrayElement(lists)

    const addToListUrl = urls.userList.itemAdd(list.id)
    setMockResponse.post(addToListUrl, {
      content_data: addToList(resource, list)
    })

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
    const { resource, lists } = setup({ inLists: [index] })
    const list = lists[index]
    const listItem = resource.lists.find(l => l.list_id === list.id)
    assertNotNil(listItem)

    const removalUrl = urls.userList.itemDetails(list.id, listItem.item_id)
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
    const { resource } = setup({ isFavorite })

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

  test("Clicking 'Create a new list' opens the create list dialog", async () => {
    setup()
    const button = await screen.findByRole("button", {
      name: "Create a new list"
    })

    expectProps(spyCreateListDialog, { open: false }, -1)
    await user.click(button)
    expectProps(spyCreateListDialog, { open: true }, -1)
  })
  test("Clicking close button calls onClose", async () => {
    const { onClose } = setup()
    const button = await screen.findByRole("button", { name: "Close" })

    expect(onClose).toHaveBeenCalledTimes(0)
    await user.click(button)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
