import React from "react"
import { faker } from "@faker-js/faker"
import { LearningResourceCard } from "ol-search-ui"
import * as factories from "ol-search-ui/build/factories"
import { urls as lrUrls } from "../../api/learning-resources"
import {
  screen,
  renderTestApp,
  setMockResponse,
  user,
  expectProps
} from "../../test-utils"
import { waitForElementToBeRemoved } from "@testing-library/react"

const spyLearningResourceCard = jest.mocked(LearningResourceCard)

jest.mock("../LearningResourceDrawer", () => {
  const actual = jest.requireActual("../LearningResourceDrawer")
  return {
    __esModule: true,
    ...actual,
    default:    jest.fn(() => <div>LearningResourceDrawer</div>)
  }
})

describe("FavoritesPage", () => {
  /**
   * Set up the mock API responses for lists page.
   */
  const setup = (itemsCount?: number) => {
    const favorites = factories.makeFavorites(
      itemsCount ?? faker.datatype.number({ min: 2, max: 5 })
    )
    setMockResponse.get(lrUrls.favoritesListing(), favorites)

    const { history } = renderTestApp({ url: `/lists/favorites` })
    return { history, favorites }
  }

  test("renders title 'My Favorites'", async () => {
    setup()
    await screen.findByRole("heading", { name: "My Favorites" })
  })

  test("Renders a card for each item in list", async () => {
    const { favorites } = setup()
    const items = favorites.results.map(r => r.content_data)
    const titles = items.map(item => item.title)
    const headings = await screen.findAllByRole("heading", {
      name: value => titles.includes(value)
    })
    expect(headings.map(h => h.textContent)).toEqual(titles)
    items.forEach(resource => {
      expectProps(spyLearningResourceCard, { resource })
    })
  })

  test.each([
    { count: 0, nullMessage: false },
    { count: 3, nullMessage: true }
  ])(
    "Renders empty message if and only if no favorites",
    async ({ count, nullMessage }) => {
      setup(count)
      const loading = screen.getByText("Loading", { exact: false })
      await waitForElementToBeRemoved(loading)
      const message = screen.queryByText("You don't have any favorites yet.")
      expect(message === null).toBe(nullMessage)
    }
  )

  test("Clicking a card title routes to resource drawer", async () => {
    const { favorites, history } = setup()
    const item = faker.helpers.arrayElement(
      favorites.results.map(r => r.content_data)
    )
    const cardTitle = await screen.findByRole("heading", { name: item.title })

    await user.click(cardTitle)
    const searchParams = new URLSearchParams(history.location.search)
    expect(searchParams.get("resource_id")).toEqual(String(item.id))
    expect(searchParams.get("resource_type")).toEqual(item.object_type)
  })
})
