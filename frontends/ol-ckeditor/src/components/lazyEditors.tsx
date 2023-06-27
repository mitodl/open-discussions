import React, { lazy, Suspense } from "react"
import type { CkeditorMarkdownProps } from "./CkeditorMarkdown"
import type { CkeditorArticleProps } from "./CkeditorArticle"
import LoadingText from "./LoadingText"

type OptionalFallback = {
  fallback?: React.ReactNode
  fallbackLines?: number
}

const RawCKEditorMarkdownLazy = lazy(() => import("./CkeditorMarkdown"))

type CkeditorMarkdownLazyProps = CkeditorMarkdownProps & OptionalFallback

const CkeditorMarkdownLazy: React.FC<CkeditorMarkdownLazyProps> = ({
  fallback,
  fallbackLines,
  ...others
}) => {
  return (
    <Suspense fallback={fallback ?? <LoadingText lines={fallbackLines} />}>
      <RawCKEditorMarkdownLazy {...others} />
    </Suspense>
  )
}

const RawCKEditorArticleLazy = lazy(() => import("./CkeditorArticle"))

type CkeditorArticleLazyProps = CkeditorArticleProps & OptionalFallback

const CkeditorArticleLazy: React.FC<CkeditorArticleLazyProps> = ({
  fallback,
  fallbackLines,
  ...others
}) => {
  return (
    <Suspense fallback={fallback ?? <LoadingText lines={fallbackLines} />}>
      <RawCKEditorArticleLazy {...others} />
    </Suspense>
  )
}

export { CkeditorMarkdownLazy, CkeditorArticleLazy }
export type { CkeditorMarkdownLazyProps, CkeditorArticleLazyProps }
