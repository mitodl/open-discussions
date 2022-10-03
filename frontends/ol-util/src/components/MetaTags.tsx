import React from "react"
import { Helmet } from "react-helmet-async"

type MetaTagsProps = {
  canonicalLink?: string
  children?: React.ReactNode
}

const removeTrailingSlash = (str: string): string =>
  str.length > 0 && str.endsWith("/") ? str.substring(0, str.length - 1) : str

const getCanonicalUrl = (url: string): string => {
  const href = removeTrailingSlash(String(new URL(url, window.location.origin)))
  return href
}

/**
 * Renders a Helmet component to customize meta tags
 */
const MetaTags: React.FC<MetaTagsProps> = ({ children, canonicalLink }) =>
  children || canonicalLink ? (
    <Helmet>
      {children}
      {canonicalLink ? (
        <link rel="canonical" href={getCanonicalUrl(canonicalLink)} />
      ) : null}
    </Helmet>
  ) : null

export default MetaTags
