import { assert } from "chai"

import { videoRequest, favoriteVideoMutation } from "./videos"
import { makeVideo } from "../../factories/learning_resources"
import { videoApiURL } from "../url"

describe("Videos API", () => {
  let video

  beforeEach(() => {
    video = makeVideo()
  })

  it("video request allows fetching a video", () => {
    const request = videoRequest("fake-id")
    assert.equal(request.url, `${videoApiURL}/fake-id/`)
    assert.deepEqual(request.transform({ id: "foobar" }), {
      videos: {
        foobar: { id: "foobar" }
      }
    })
  })

  //
  ;[true, false].forEach(isFavorite => {
    it(`videoFavoriteMutation does the right stuff if ${
      isFavorite ? "is" : "is not"
    } favorite`, () => {
      video.is_favorite = isFavorite
      const mutation = favoriteVideoMutation(video)
      assert.equal(
        mutation.url,
        `${videoApiURL}/${video.id}/${isFavorite ? "unfavorite" : "favorite"}/`
      )
      assert.deepEqual(mutation.transform(), {
        videos: {
          [video.id]: {
            ...video,
            is_favorite: !isFavorite
          }
        }
      })
    })
  })
})
