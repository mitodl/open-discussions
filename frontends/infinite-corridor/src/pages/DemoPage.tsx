import React, { useState, useCallback } from "react"
import Container from "@mui/material/Container"

import {
  useCourseSearch,
  buildSearchQuery,
  SearchQueryParams,
  Aggregation
} from "@mitodl/course-search-utils"
import { LearningResourceSearchResult, SearchInput } from "ol-search-ui"
import { LoadingSpinner } from "ol-util"

import axios from "../libs/axios"
import { useHistory } from "react-router"
import ReactAppzi from "react-appzi"
import Button from "@mui/material/Button"

const pageSize = 12
const categoryLimit = 6

interface ResultWithInnerHits {
  _source: LearningResourceSearchResult
  inner_hits: {
    top_by_category: {
      hits: { hits: { _source: LearningResourceSearchResult; _score: number } }
    }
  }
}

interface Result {
  _source: LearningResourceSearchResult
  _score: number
}

const SEARCH_API_URL = "search/"

const search = async (params: SearchQueryParams, type: string) => {
  const body = buildSearchQuery(params)

  if (type === "course") {
    body["collapse"] = {
      field:      "platform",
      inner_hits: {
        name: "top_by_category",
        size: categoryLimit
      }
    }
  } else {
    body["collapse"] = {
      field:      "offered_by",
      inner_hits: {
        name: "top_by_category",
        size: categoryLimit
      }
    }
  }

  try {
    const { data } = await axios.post(SEARCH_API_URL, body)
    return data
  } catch (err) {
    return null
  }
}

const extractNestedResults = (results: ResultWithInnerHits[]) => {
  return results
    .flatMap(
      categoryResults => categoryResults.inner_hits.top_by_category.hits.hits
    )
    .sort((result1, result2) => result2._score - result1._score)
    .slice(0, pageSize)
}

type ResultsListProps = {
  results: Result[]
}

const ResultsList: React.FC<ResultsListProps> = ({ results }) => {
  return (
    <ul>
      {results.map(hit => (
        <li
          className="resource-result"
          key={hit._source.object_type.concat(hit._source.id.toString())}
        >
          {hit._source.title}{" "}
          {hit._source.offered_by && hit._source.offered_by.length > 0 ?
            `(${hit._source.offered_by.join(", ")})` :
            null}
        </li>
      ))}
    </ul>
  )
}

const DemoPage: React.FC = () => {
  const [courseResults, setCourseResults] = useState<Result[]>([])
  const [videoResults, setVideoResults] = useState<Result[]>([])
  const [podcastResults, setPodcastResults] = useState<Result[]>([])

  const [completedInitialLoad, setCompletedInitialLoad] = useState(false)
  const [requestInFlight, setRequestInFlight] = useState(false)
  const [searchApiFailed, setSearchApiFailed] = useState(false)
  ReactAppzi.initialize("J0puw")

  const clearSearch = useCallback(() => {
    setCourseResults([])
    setVideoResults([])
    setPodcastResults([])
    setCompletedInitialLoad(false)
  }, [])

  const runSearch = useCallback(async (text: string) => {
    if (text) {
      //add quotes to multi word strings if they don't already have them

      setRequestInFlight(true)
      const from = 0
      const courseFilter = { type: ["course"] }
      const videoFilter = { type: ["video"] }
      const podcastFilter = { type: ["podcast", "podcastepisode"] }

      const promises = [
        search(
          {
            text,
            from,
            activeFacets: courseFilter,
            size:         pageSize
          },
          "course"
        ),
        search(
          {
            text,
            from,
            activeFacets: videoFilter,
            size:         pageSize
          },
          "video"
        ),
        search(
          {
            text,
            from,
            activeFacets: podcastFilter,
            size:         pageSize
          },
          "podcast"
        )
      ]

      const [newCourseResults, newVideoResults, newPodcastResults] =
        await Promise.all(promises)

      setRequestInFlight(false)

      if (
        !newCourseResults ||
        newCourseResults["apiFailed"] ||
        !newVideoResults ||
        newVideoResults["apiFailed"] ||
        !newPodcastResults ||
        newPodcastResults["apiFailed"]
      ) {
        setSearchApiFailed(true)
        return
      }

      setCourseResults(extractNestedResults(newCourseResults.hits.hits))

      setVideoResults(extractNestedResults(newVideoResults.hits.hits))

      setPodcastResults(extractNestedResults(newPodcastResults.hits.hits))

      setCompletedInitialLoad(true)
    }
  }, [])

  const history = useHistory()
  const { updateText, text, onSubmit, clearText } = useCourseSearch(
    runSearch,
    clearSearch,
    new Map<string, Aggregation>(),
    completedInitialLoad && !requestInFlight,
    pageSize,
    history
  )

  return (
    <Container className="demo-page">
      <Container className="search-container">
        <h1 className="page-title">Feedback on our Search</h1>
        <div className="header">
          We have sourced open educational resources from across Open Learning
          and MIT. Take our search for a spin, and let us know what you find.
        </div>

        <SearchInput
          className="main-search"
          placeholder=""
          onChange={updateText}
          value={text || ""}
          onClear={clearText}
          onSubmit={onSubmit}
          autoFocus
        />
        <div className="search-label">
          Examples: albedo, poverty trap, quantum state tomography
        </div>
      </Container>
      <Container className="results-container">
        {searchApiFailed ? (
          <div className="no-results-found">
            <span>Oops! Something went wrong.</span>
          </div>
        ) : completedInitialLoad ? (
          courseResults.length === 0 &&
          videoResults.length === 0 &&
          podcastResults.length === 0 ? (
              <div>
                <div>
                  <Button
                    data-az-l="8c48a94d-2e0b-4a17-aa0e-2aa0cd910974"
                    className="feedback-button"
                    variant="outlined"
                  >
                  Feedback?
                  </Button>
                </div>
                <div className="no-results">No results found for your query</div>
              </div>
            ) : (
              <div>
                <Button
                  data-az-l="8c48a94d-2e0b-4a17-aa0e-2aa0cd910974"
                  className="feedback-button"
                  variant="outlined"
                >
                Feedback?
                </Button>
                {courseResults.length > 0 ? (
                  <div>
                    <h2>Courses</h2>
                    <ResultsList results={courseResults} />
                  </div>
                ) : null}
                {videoResults.length > 0 ? (
                  <div>
                    <h2>Videos</h2>
                    <ResultsList results={videoResults} />
                  </div>
                ) : null}
                {podcastResults.length > 0 ? (
                  <div>
                    <h2>Podcasts</h2>
                    <ResultsList results={podcastResults} />
                  </div>
                ) : null}
              </div>
            )
        ) : text ? (
          <LoadingSpinner loading={requestInFlight} />
        ) : null}
      </Container>
    </Container>
  )
}

export default DemoPage
