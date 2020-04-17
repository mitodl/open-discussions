// @flow
import { range, reverse, sortBy } from "ramda"
import { assert } from "chai"

import { podcastApiURL, recentPodcastApiURL } from "./lib/url"
import { makePodcast, makePodcastEpisode } from "./factories/podcasts"
import IntegrationTestHelper from "./util/integration_test_helper"
import PodcastFrontpage from "./pages/PodcastFrontpage"
import { shouldIf, isIf, queryListResponse } from "./lib/test_utils"

describe("PodcastFrontPage", () => {
  let helper, podcasts, recentEpisodes, render

  beforeEach(() => {
    podcasts = range(0, 5).map(() => makePodcast())
    recentEpisodes = []
    for (const podcast of podcasts) {
      range(0, 3).forEach(() => {
        recentEpisodes.push(makePodcastEpisode(podcast))
      })
    }
    recentEpisodes = reverse(
      sortBy(episode => episode.last_modified, recentEpisodes)
    )

    helper = new IntegrationTestHelper()
    helper.handleRequestStub
      .withArgs(recentPodcastApiURL)
      .returns(queryListResponse(recentEpisodes))
    helper.handleRequestStub
      .withArgs(podcastApiURL)
      .returns({ status: 200, body: podcasts })

    render = helper.configureReduxQueryRenderer(PodcastFrontpage)
  })

  afterEach(() => {
    helper.cleanup()
  })

  //
  ;[
    [true, true, true, true],
    [true, false, true, true],
    [false, true, false, true],
    [false, false, false, false]
  ].forEach(
    ([
      podcastLoading,
      episodesLoading,
      expectedPodcastSpinner,
      expectedRecentEpisodesSpinner
    ]) => {
      it(`${shouldIf(
        expectedPodcastSpinner
      )} show a spinner for podcasts and ${shouldIf(
        expectedRecentEpisodesSpinner
      )} for recent episodes, if podcasts ${isIf(
        podcastLoading
      )} loading and recent episodes ${isIf(
        episodesLoading
      )} loading`, async () => {
        helper.isLoadingStub.withArgs(podcastApiURL).returns(podcastLoading)
        helper.isLoadingStub
          .withArgs(recentPodcastApiURL)
          .returns(episodesLoading)

        const { wrapper } = await render()
        assert.equal(
          expectedRecentEpisodesSpinner,
          wrapper
            .find(".recent-episodes")
            .find("PostLoading")
            .exists()
        )
        assert.equal(
          expectedPodcastSpinner,
          wrapper
            .find(".all-podcasts")
            .find("PostLoading")
            .exists()
        )
      })
    }
  )
})
