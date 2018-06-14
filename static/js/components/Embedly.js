// @flow
import React from "react"

import ContentLoader from "react-content-loader"

import { urlHostname } from "../lib/url"

export const EmbedlyLoader = (props: Object = {}) => (
  <div className="content-loader">
    <ContentLoader
      speed={2}
      style={{ width: "100%", height: "300px" }}
      width="100%"
      height={300}
      {...props}
    >
      <rect x="0" y="0" rx="5" ry="5" width="100%" height="200" />
      <rect x="0" y="220" rx="5" ry="5" width="65%" height="15" />
      <rect x="0" y="250" rx="5" ry="5" width="93%" height="10" />
      <rect x="0" y="265" rx="5" ry="5" width="95%" height="10" />
      <rect x="0" y="280" rx="5" ry="5" width="90%" height="10" />
    </ContentLoader>
  </div>
)

type Props = {
  embedly: Object
}

export default class Embedly extends React.Component<Props> {
  renderEmbed() {
    const { embedly } = this.props

    // the response includes HTML which can be used to load a rich embed
    // (either a video or the 'rich' type)
    if (embedly.type === "video") {
      return (
        <div
          className="video-container"
          dangerouslySetInnerHTML={{ __html: embedly.html }}
        />
      )
    }

    if (embedly.type === "rich" || embedly.html) {
      return (
        <div
          className="rich"
          dangerouslySetInnerHTML={{ __html: embedly.html }}
        />
      )
    }

    if (embedly.type === "photo") {
      return (
        <div className="photo">
          <img src={embedly.url} />
        </div>
      )
    }

    const compactView =
      embedly.thumbnail_url &&
      (embedly.thumbnail_height < 400 || embedly.thumbnail_width < 400)

    return (
      <React.Fragment>
        <a
          href={embedly.url}
          target="_blank"
          className={compactView ? "link compact" : "link"}
          rel="noopener noreferrer"
        >
          {embedly.thumbnail_url ? (
            <div className={compactView ? "thumbnail compact" : "thumbnail"}>
              <img src={embedly.thumbnail_url} />
            </div>
          ) : null}
          <div className="link-summary">
            <h2>{embedly.title}</h2>
            <div className="description">{embedly.description}</div>
          </div>
        </a>
        <a
          href={embedly.url}
          target="_blank"
          rel="noopener noreferrer"
          className="read-more-link"
        >
          Read this on {urlHostname(embedly.url)}
        </a>
      </React.Fragment>
    )
  }

  render() {
    const { embedly } = this.props

    return embedly && embedly.type !== "error" ? (
      <div className="embedly">{this.renderEmbed()}</div>
    ) : (
      <EmbedlyLoader />
    )
  }
}
