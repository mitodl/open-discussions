import { faker } from "@faker-js/faker"
import * as factories from "ol-search-ui/build/factories"
import {
  urls as lrUrls
} from "../../api/learning-resources"
import {
  screen,
  renderTestApp,
  setMockResponse,
  waitFor,
  expectProps
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
  const setup = (itemsCount?: number) => {
    const favorites = factories.makeFavorites(
      itemsCount ?? faker.datatype.number({ min: 2, max: 5 })
    )
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
    expectProps(spyItemsListing, {
      isLoading:    true,
      data:         undefined,
      emptyMessage: "You don't have any favorites yet."
    })

    await waitFor(() => {
      expectProps(
        spyItemsListing,
        {
          isLoading:    false,
          data:         favorites,
          emptyMessage: "You don't have any favorites yet."
        },
        -1
      )
    })
  })
})
