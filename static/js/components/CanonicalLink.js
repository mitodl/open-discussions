// @flow
/* global SETTINGS: false */
import React from "react"

import { removeTrailingSlash } from "../lib/util"

import type { Match } from "react-router"

type Props = {
  relativeUrl?: ?string,
  match?: ?Match
}

const CanonicalLink = ({ relativeUrl, match }: Props) => {
  let partialUrl
  if (relativeUrl) {
    partialUrl = relativeUrl
  } else if (match && match.url) {
    partialUrl = match.url
  } else {
    return null
  }

  const href = removeTrailingSlash(
    String(new URL(partialUrl, SETTINGS.site_url))
  )

  return <link rel="canonical" href={href} />
}

export default CanonicalLink
