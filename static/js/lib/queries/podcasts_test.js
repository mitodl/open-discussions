import { assert } from "chai"

import {
  podcastRequest,
  podcastEpisodeRequest,
  favoritePodcastMutation,
  favoritePodcastEpisodeMutation
} from "./podcasts"
import { makePodcast, makePodcastEpisode } from "../../factories/podcasts"
import { podcastDetailApiURL, podcastEpisodeDetailApiURL } from "../url"
import { isIf } from "../../lib/test_utils"

describe("Podcasts API", () => {
  let podcast, podcastEpisode

  it("podcast request allows fetching a podcast", () => {
    podcast = makePodcast()
    const request = podcastRequest("fake-id")
    assert.equal(
      request.url,
      podcastDetailApiURL.param({ podcastId: "fake-id" }).toString()
    )
    assert.deepEqual(request.transform({ id: "foobar" }), {
      podcasts: {
        foobar: { id: "foobar" }
      }
    })
  })

  it("podcast episode request allows fetching a podcast episode", () => {
    podcastEpisode = makePodcastEpisode()
    const request = podcastEpisodeRequest("fake-id")
    assert.equal(
      request.url,
      podcastEpisodeDetailApiURL.param({ episodeId: "fake-id" }).toString()
    )
    assert.deepEqual(request.transform({ id: "foobar" }), {
      podcastEpisodes: {
        foobar: { id: "foobar" }
      }
    })
  })

  //
  ;[true, false].forEach(isFavorite => {
    podcast = makePodcast()
    it(`podcastFavoriteMutation works correcly if ${isIf(
      isFavorite
    )} favorite`, () => {
      podcast.is_favorite = isFavorite
      const mutation = favoritePodcastMutation(podcast)
      assert.equal(
        mutation.url,
        `${podcastDetailApiURL.param({ podcastId: podcast.id }).toString()}${
          isFavorite ? "/unfavorite" : "/favorite"
        }/`
      )
      assert.deepEqual(mutation.transform(), {
        podcasts: {
          [podcast.id]: {
            ...podcast,
            is_favorite: !isFavorite
          }
        }
      })
    })
  })
  ;[true, false].forEach(isFavorite => {
    podcastEpisode = makePodcastEpisode()
    it(`podcastFavoriteMutation works correcly if ${isIf(
      isFavorite
    )} favorite`, () => {
      podcastEpisode.is_favorite = isFavorite
      const mutation = favoritePodcastEpisodeMutation(podcastEpisode)
      assert.equal(
        mutation.url,
        `${podcastEpisodeDetailApiURL
          .param({ episodeId: podcastEpisode.id })
          .toString()}${isFavorite ? "/unfavorite" : "/favorite"}/`
      )
      assert.deepEqual(mutation.transform(), {
        podcastEpisodes: {
          [podcastEpisode.id]: {
            ...podcastEpisode,
            is_favorite: !isFavorite
          }
        }
      })
    })
  })
})
