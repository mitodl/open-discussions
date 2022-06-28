import React from "react"

type Props = {
  /**
   * TODO: This should be required.
   */
  relativeUrl?: string
  match?: { url: string }
}

const removeTrailingSlash = (str: string): string =>
  str.length > 0 && str.endsWith("/") ? str.substring(0, str.length - 1) : str

const CanonicalLink = ({ relativeUrl, match }: Props): JSX.Element | null => {
  const partialUrl = relativeUrl ?? match?.url
  if (!partialUrl) return null

  const href = removeTrailingSlash(
    String(new URL(partialUrl, window.location.origin))
  )

  return <link rel="canonical" href={href} />
}

export default CanonicalLink
