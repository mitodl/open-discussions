import React from "react"
import { Helmet } from "react-helmet-async"
import { getCanonicalUrl } from "../lib"

type MetaTagsProps = {
  canonicalLink?: string
  children?: React.ReactNode
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
