// @flow
import { assert } from "chai"

import FavoritesDetailPage from "./FavoritesDetailPage"
import { LearningResourceCard } from "../components/LearningResourceCard"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makeFavoritesResponse } from "../factories/learning_resources"
import { queryListResponse } from "../lib/test_utils"
import { userListApiURL, favoritesURL } from "../lib/url"

describe("FavoritesDetailPage tests", () => {
  let render, favorites, helper

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    favorites = makeFavoritesResponse()
    helper.handleRequestStub
      .withArgs(favoritesURL)
      .returns(queryListResponse(favorites))
    helper.handleRequestStub
      .withArgs(userListApiURL.toString())
      .returns(queryListResponse([]))
    render = helper.configureReduxQueryRenderer(FavoritesDetailPage)
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should should show the title 'My Favorites'", async () => {
    const { wrapper } = await render()
    assert.equal(wrapper.find(".list-header").text(), "My Favorites")
  })

  it("should the items the user has favorited", async () => {
    const { wrapper } = await render()
    assert.deepEqual(
      [...wrapper.find(LearningResourceCard)]
        .map(card => card.props.object.id)
        .sort(),
      favorites.map(item => item.content_data.id).sort()
    )
  })

  it("should have a drawer for showing istems, adding to lists", async () => {
    const { wrapper } = await render()
    assert.ok(wrapper.find("LearningResourceDrawer"))
    assert.ok(wrapper.find("AddToListDialog"))
  })

  it("should show an empty message if there aren't any favorites", async () => {
    favorites = []
    helper.handleRequestStub
      .withArgs(favoritesURL)
      .returns(queryListResponse([]))

    const { wrapper } = await render()
    assert.equal(
      wrapper.find(".empty-message").at(0).text(),
      "You don't have any favorites."
    )
  })
})
