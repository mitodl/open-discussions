// @flow
import React, { useState, useCallback } from "react"

import type { Podcast } from "../flow/podcastTypes"

type Props = {
  podcast: Podcast
}

export default function PodcastSubscribeButton(props: Props) {
  const { podcast } = props
  const [showButtons, setShowButtons] = useState(false)

  if (!podcast.google_podcasts_url && !podcast.apple_podcasts_url) {
    return null
  }

  const toggleShowButtons = useCallback(
    e => {
      e.preventDefault()
      setShowButtons(!showButtons)
    },
    [showButtons, setShowButtons]
  )

  return showButtons ? (
    <div
      className="podcast-subscribe-button links"
      onMouseLeave={toggleShowButtons}
    >
      {podcast.google_podcasts_url ? (
        <a
          href={podcast.google_podcasts_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src="/static/images/google_podcasts.png" />
        </a>
      ) : null}
      {podcast.apple_podcasts_url ? (
        <a
          href={podcast.apple_podcasts_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src="/static/images/apple_podcasts.png" />
        </a>
      ) : null}
    </div>
  ) : (
    <button
      className="blue-btn podcast-subscribe-button"
      onClick={toggleShowButtons}
      onMouseEnter={toggleShowButtons}
    >
      Subscribe
    </button>
  )
}
