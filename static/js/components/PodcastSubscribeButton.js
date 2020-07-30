// @flow
import React, { useState, useCallback } from "react"

type Props = {
  rssUrl: string,
  appleUrl?: ?string,
  googleUrl?: ?string,
  buttonText: string
}

export default function PodcastSubscribeButton(props: Props) {
  const { rssUrl, appleUrl, googleUrl, buttonText } = props
  const [showButtons, setShowButtons] = useState(false)

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
      {googleUrl ? (
        <a href={googleUrl} target="_blank" rel="noopener noreferrer">
          <img src="/static/images/google_podcasts.png" />
        </a>
      ) : null}
      {appleUrl ? (
        <a href={appleUrl} target="_blank" rel="noopener noreferrer">
          <img src="/static/images/apple_podcasts.png" />
        </a>
      ) : null}
      <a href={rssUrl} target="_blank" rel="noopener noreferrer">
        <img src="/static/images/rss_logo.png" />
      </a>
    </div>
  ) : (
    <button
      className="blue-btn podcast-subscribe-button"
      onClick={toggleShowButtons}
      onMouseEnter={toggleShowButtons}
    >
      {buttonText}
    </button>
  )
}
