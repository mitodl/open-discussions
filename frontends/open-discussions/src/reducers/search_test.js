// @flow
import { actions } from "../actions"
import IntegrationTestHelper from "../util/integration_test_helper"
import { assert } from "chai"
import { makeSearchFacetResult, makeSearchResponse } from "../factories/search"

describe("search reducers", () => {
  let helper, dispatchThen, response

  beforeEach(() => {
    response = makeSearchResponse()
    helper = new IntegrationTestHelper()
    dispatchThen = helper.store.createDispatchThen(state => state.search)
    helper.searchStub.returns(Promise.resolve(response))
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should fetch search results", async () => {
    const { data } = await dispatchThen(
      actions.search.post({ from: 0, size: 5 }),
      [actions.search.post.requestType, actions.search.post.successType]
    )
    assert.deepEqual(data, {
      initialLoad: false,
      results:     response.hits.hits.map(item => item._source),
      facets:      new Map(),
      total:       response.hits.total,
      suggest:     response.suggest
    })
  })

  it("should fetch search results with facets", async () => {
    response = makeSearchResponse(5, 10, "course", true)
    helper.searchStub.returns(Promise.resolve(response))
    const { data } = await dispatchThen(
      actions.search.post({ from: 0, size: 5 }),
      [actions.search.post.requestType, actions.search.post.successType]
    )
    assert.deepEqual(data, {
      initialLoad: false,
      results:     response.hits.hits.map(item => item._source),
      facets:      new Map(Object.entries(makeSearchFacetResult())),
      total:       response.hits.total,
      suggest:     response.suggest
    })
  })

  it("should truncate search results based on the from argument", async () => {
    await dispatchThen(actions.search.post({ from: 0, size: 5 }), [
      actions.search.post.requestType,
      actions.search.post.successType
    ])
    const { data } = await dispatchThen(
      actions.search.post({ from: 2, size: 5 }),
      [actions.search.post.requestType, actions.search.post.successType]
    )
    const hits = response.hits.hits.map(item => item._source)
    assert.deepEqual(data, {
      initialLoad: false,
      results:     hits.slice(0, 2).concat(hits.slice(0, 5)),
      facets:      new Map(),
      total:       response.hits.total,
      suggest:     response.suggest
    })
  })
})
