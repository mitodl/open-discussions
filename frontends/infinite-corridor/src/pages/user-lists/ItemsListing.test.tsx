import React from "react"
import { faker } from "@faker-js/faker"
import LearningResourceCard from "../../components/LearningResourceCard"
import * as factories from "ol-search-ui/src/factories"
import { screen, expectProps, renderWithProviders } from "../../test-utils"
import UserListItems, { UserListItemsProps } from "./ItemsListing"

const spyLearningResourceCard = jest.mocked(LearningResourceCard)

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
})
