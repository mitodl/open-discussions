import React from "react"
import { faker } from "@faker-js/faker"
import { LearningResourceCard } from "ol-search-ui"
import * as factories from "ol-search-ui/build/factories"
import {
  screen,
  user,
  expectProps,
  renderWithProviders
} from "../../test-utils"
import UserListItems, { UserListItemsProps } from "./ItemsListing"

const spyLearningResourceCard = jest.mocked(LearningResourceCard)

jest.mock("../LearningResourceDrawer", () => {
  const actual = jest.requireActual("../LearningResourceDrawer")
  return {
    __esModule: true,
    ...actual,
    default:    jest.fn(() => <div>LearningResourceDrawer</div>)
  }
})

const setup = (props: Partial<UserListItemsProps>) => {
  const defaultProps: UserListItemsProps = {
    isLoading:    true,
    emptyMessage: "Empty message"
  }
  const allProps = { ...defaultProps, ...props }
  const { history } = renderWithProviders(<UserListItems {...allProps} />)
  return { history }
}

describe("ItemsListing", () => {
  test("Shows loading message while loading", () => {
    setup({ isLoading: true })
    screen.getByText("Loading...")
  })

  test.each([
    { count: 0, hasEmptyMessage: true },
    { count: 3, hasEmptyMessage: false }
  ])(
    "Shows empty message when there are no items",
    ({ count, hasEmptyMessage }) => {
      const emptyMessage = faker.lorem.sentence()
      const data = factories.makeUserListItemsPaginated(count)
      setup({ isLoading: false, emptyMessage, data })
      const emptyMessageElement = screen.queryByText(emptyMessage)
      expect(!!emptyMessageElement).toBe(hasEmptyMessage)
    }
  )

  test("Shows a list of LearningResourceCards", () => {
    const data = factories.makeUserListItemsPaginated(3)
    const items = data.results.map(result => result.content_data)
    setup({ isLoading: false, data })
    const titles = items.map(item => item.title)
    const headings = screen.getAllByRole("heading", {
      name: value => titles.includes(value)
    })
    expect(headings.map(h => h.textContent)).toEqual(titles)
    items.forEach(resource => {
      expectProps(spyLearningResourceCard, { resource })
    })
  })

  test("Clicking a card title routes to LearningResourceDrawer", async () => {
    const data = factories.makeUserListItemsPaginated(3)
    const items = data.results.map(result => result.content_data)
    const { history } = setup({ data })
    const item = faker.helpers.arrayElement(items)
    const cardTitle = await screen.findByRole("heading", { name: item.title })

    await user.click(cardTitle)
    const searchParams = new URLSearchParams(history.location.search)
    expect(searchParams.get("resource_id")).toEqual(String(item.id))
    expect(searchParams.get("resource_type")).toEqual(item.object_type)
  })
})
