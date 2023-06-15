import { faker } from "@faker-js/faker"
import * as factories from "ol-search-ui/src/factories"
import { urls as lrUrls } from "../../api/learning-resources"
import {
  screen,
  renderTestApp,
  setMockResponse,
  waitFor,
  expectLastProps
} from "../../test-utils"
import ItemsListing from "./ItemsListing"

jest.mock("./ItemsListing", () => {
  const actual = jest.requireActual("./ItemsListing")
  return {
    __esModule: true,
    ...actual,
    default:    jest.fn(actual.default)
  }
})

const spyItemsListing = jest.mocked(ItemsListing)

describe("FavoritesPage", () => {
  /**
   * Set up the mock API responses for lists page.
   */
  const setup = () => {
    const count = faker.datatype.number({ min: 2, max: 5 })
    const favorites = factories.makeFavorites({ count })
    setMockResponse.get(lrUrls.favorite.listing(), favorites)

    const { history } = renderTestApp({ url: `/lists/favorites` })
    return { history, favorites }
  }

  test("renders title 'My Favorites'", async () => {
    setup()
    await screen.findByRole("heading", { name: "My Favorites" })
  })

  test("Passes appropriate props to ItemsListing", async () => {
    const { favorites } = setup()
    expectLastProps(spyItemsListing, {
      isLoading:    true,
      items:        undefined,
      emptyMessage: "You don't have any favorites yet."
    })

    await waitFor(() => {
      expectLastProps(spyItemsListing, {
        isLoading:    false,
        items:        favorites.results,
        emptyMessage: "You don't have any favorites yet."
      })
    })
  })
})
