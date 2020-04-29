// @flow=
import { assert } from "chai"

import {
  interactionMutation,
  popularContentRequest,
  popularContentSelector
} from "./interactions"
import { mapResourcesToResourceRefs } from "./learning_resources"
import { interactionsApiURL, popularContentUrl } from "../url"
import { DEFAULT_POST_OPTIONS } from "../redux_query"
import {
  makeVideo,
  makeCourse,
  makeUserList,
  makeProgram
} from "../../factories/learning_resources"
import { makePodcast, makePodcastEpisode } from "../../factories/podcasts"

describe("Interactions API", () => {
  it("interactionMutation should return a correct query", () => {
    const query = interactionMutation("view", "course", 1)
    assert.deepEqual(query.body, {
      interaction_type: "view",
      content_type:     "course",
      content_id:       1
    })
    assert.equal(query.queryKey, "interactionMutation")
    assert.equal(query.url, interactionsApiURL)
    assert.deepEqual(query.options, {
      method: "POST",
      ...DEFAULT_POST_OPTIONS
    })
  })

  it("popularContentSelector should return the popular content in order", () => {
    const course = makeCourse()
    const video = makeVideo()
    assert.deepEqual(
      popularContentSelector({
        entities: {
          courses: {
            [course.id]: course
          },
          videos: {
            [video.id]: video
          },
          popularResources: [
            {
              content_type: video.object_type,
              object_id:    video.id
            },
            {
              content_type: course.object_type,
              object_id:    course.id
            }
          ]
        }
      }),
      [video, course]
    )
  })

  it("popularContentRequest allows fetching of popular resources", () => {
    const course = makeCourse()
    const video = makeVideo()
    const program = makeProgram()
    const userList = makeUserList()
    const podcast = makePodcast()
    const podcastEpisode = makePodcastEpisode(podcast)
    const results = [course, video, program, userList, podcast, podcastEpisode]
    const request = popularContentRequest()
    assert.equal(request.url, popularContentUrl)
    assert.deepEqual(request.transform({ results }), {
      courses: {
        [course.id]: course
      },
      programs: {
        [program.id]: program
      },
      videos: {
        [video.id]: video
      },
      userLists: {
        [userList.id]: userList
      },
      podcasts: {
        [podcast.id]: podcast
      },
      podcastEpisodes: {
        [podcastEpisode.id]: podcastEpisode
      },
      popularResources: mapResourcesToResourceRefs(results)
    })
  })
})
