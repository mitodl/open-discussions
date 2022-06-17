// @flow
import R from "ramda"
import { assert } from "chai"

import PaginatedPodcastEpisodes from "./PaginatedPodcastEpisodes"

import { podcastDetailEpisodesApiURL } from "../lib/url"
import { makePodcast, makePodcastEpisode } from "../factories/podcasts"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("PaginatedPodcastEpisodes", () => {
  let podcast, episodes1, episodes2, render, helper

  beforeEach(() => {
    podcast = makePodcast()
    episodes1 = R.times(() => makePodcastEpisode(podcast), 10)
    episodes2 = R.times(() => makePodcastEpisode(podcast), 6)

    helper = new IntegrationTestHelper()
    helper.handleRequestStub
      .withArgs(
        podcastDetailEpisodesApiURL.param({ podcastId: podcast.id }).toString()
      )
      // page 1
      .onFirstCall()
      .returns({
        status: 200,
        body:   {
          count:   16,
          results: episodes1,
          prev:    null,
          next:    "/next"
        }
      })
      // page 2
      .onSecondCall()
      .returns({
        status: 200,
        body:   {
          count:   16,
          results: episodes2,
          prev:    "/prev",
          next:    null
        }
      })
      // page 1 again
      .onThirdCall()
      .returns({
        status: 200,
        body:   {
          count:   20,
          results: episodes1,
          prev:    null,
          next:    "/next"
        }
      })
    render = helper.configureReduxQueryRenderer(PaginatedPodcastEpisodes, {
      podcast,
      pageSize: 10
    })
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render the episodes", async () => {
    const { wrapper } = await render()
    const cards = wrapper.find("PodcastEpisodeCard")
    assert.equal(cards.length, episodes1.length)
    R.zip([...cards], episodes1).forEach(([card, episode]) => {
      assert.deepEqual(card.props.episode, episode)
      assert.deepEqual(card.props.podcast, podcast)
    })
  })

  it("should disable next button when one full page is present", async () => {
    helper.handleRequestStub
      .withArgs(
        podcastDetailEpisodesApiURL.param({ podcastId: podcast.id }).toString()
      )
      .onFirstCall()
      .returns({
        status: 200,
        body:   {
          count:   10,
          results: episodes1,
          prev:    null,
          next:    "/next"
        }
      })
    const { wrapper } = await render()
    assert.isTrue(wrapper.find(".next").prop("disabled"))
  })

  it("should let the user navigate items pages", async () => {
    const { wrapper } = await render()
    wrapper.find(".next").simulate("click")

    let cards = wrapper.find("PodcastEpisodeCard")
    assert.equal(cards.length, episodes2.length)
    R.zip([...cards], episodes2).forEach(([card, episode]) => {
      assert.deepEqual(card.props.episode, episode)
      assert.deepEqual(card.props.podcast, podcast)
    })

    wrapper.find(".previous").simulate("click")

    cards = wrapper.find("PodcastEpisodeCard")
    assert.equal(cards.length, episodes1.length)
    R.zip([...cards], episodes1).forEach(([card, episode]) => {
      assert.deepEqual(card.props.episode, episode)
      assert.deepEqual(card.props.podcast, podcast)
    })
  })
})
