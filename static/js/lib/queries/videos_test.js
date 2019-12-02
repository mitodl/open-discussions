import { assert } from "chai"

import { videoRequest, newVideosRequest, favoriteVideoMutation } from "./videos"
import { makeVideo } from "../../factories/learning_resources"
import { videoApiURL, newVideosURL } from "../url"
import { constructIdMap } from "../redux_query"

import R from "ramda"

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

  it("new videos request allows fetching a list of videos", () => {
    const results = R.times(makeVideo, 11)
    const transformTestObject = {
      results,
      next: "http://a.url"
    }

    const request = newVideosRequest()

    assert.equal(request.url, newVideosURL)
    assert.deepEqual(request.transform(transformTestObject), {
      videos:    constructIdMap(results),
      newVideos: results.map(result => result.id)
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
