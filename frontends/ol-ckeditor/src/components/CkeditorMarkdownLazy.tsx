import React, { lazy, Suspense } from "react"
import type { CkeditorMarkdownProps } from "./CkeditorMarkdown"
import LoadingText from "./LoadingText"

type CkeditorMarkdownLazyProps = CkeditorMarkdownProps & {
  fallback?: React.ReactNode
}

const RawCKEditorMarkdownLazy = lazy(() => import("./CkeditorMarkdown"))

const CKEditorMarkdownLazy: React.FC<CkeditorMarkdownLazyProps> = ({
  fallback,
  ...others
}) => {
  return (
    <Suspense fallback={fallback ?? <LoadingText />}>
      <RawCKEditorMarkdownLazy {...others} />
    </Suspense>
  )
}

export default CKEditorMarkdownLazy
export type { CkeditorMarkdownLazyProps }
