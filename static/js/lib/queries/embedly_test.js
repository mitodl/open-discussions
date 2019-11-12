import { assert } from "chai"

import { embedlyRequest } from "./embedly"
import { makeYoutubeVideo } from "../../factories/embedly"
import { embedlyApiURL } from "../url"

describe("Embedly API", () => {
  let embedly

  beforeEach(() => {
    embedly = makeYoutubeVideo()
  })

  it("program request allows fetching a program", () => {
    const request = embedlyRequest(embedly.url)
    assert.equal(
      request.url,
      `${embedlyApiURL}/${encodeURIComponent(encodeURIComponent(embedly.url))}/`
    )
    assert.deepEqual(request.transform(embedly), {
      embedlys: {
        [embedly.url]: embedly
      }
    })
  })
})
