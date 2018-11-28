// @flow
import React from "react"
import R from "ramda"
import ContentLoader from "react-content-loader"

import { NotFound, NotAuthorized } from "../components/ErrorPages"
import Card from "./Card"
import { contentLoaderSpeed } from "../lib/constants"

type LoadingProps = {
  loaded: boolean,
  errored: boolean,
  notFound: boolean,
  notAuthorized: boolean
}

type SpinnerProps = {
  className?: string
}

const emptyPostsToRender = 5

export const Loading = (props: SpinnerProps) => (
  <div className={`loading ${props.className ? props.className : ""}`}>
    <div className="sk-three-bounce">
      <div className="sk-child sk-bounce1" />
      <div className="sk-child sk-bounce2" />
      <div className="sk-child sk-bounce3" />
    </div>
  </div>
)

const AnimatedEmptyPost = (i: number) => {
  return (
    <div className="post-content-loader" key={`loader-${i}`}>
      <Card className="compact-post-summary">
        <div className="post-toprow">
          <ContentLoader
            speed={contentLoaderSpeed}
            style={{ width: "100%", height: "137px" }}
            width={1000}
            height={137}
            preserveAspectRatio="none"
          >
            <rect x="0" y="0" rx="5" ry="5" width="70%" height="20" />
            <rect x="0" y="40" rx="5" ry="5" width="70%" height="16" />
            <rect x="0" y="58" rx="5" ry="5" width="70%" height="16" />
            <rect x="0" y="113" rx="5" ry="5" width="70" height="24" />
            <rect x="75%" y="0" rx="5" ry="5" width="25%" height="103" />
            <rect x="89%" y="113" rx="5" ry="5" width="11%" height="24" />
          </ContentLoader>
        </div>
      </Card>
    </div>
  )
}

export const PostLoading = () => (
  <div className="post-loader">
    <div className="post-list-title">
      <ContentLoader
        speed={contentLoaderSpeed}
        style={{ width: "100%", height: "24px" }}
        width={1000}
        height={24}
        preserveAspectRatio="none"
      >
        <rect x="0" y="0" rx="5" ry="5" width="100%" height="100%" />
      </ContentLoader>
    </div>
    {R.times(AnimatedEmptyPost, emptyPostsToRender)}
  </div>
)

export const renderDeferredLoading = ({
  LoadingComponent,
  loaded,
  errored,
  notAuthorized,
  notFound,
  render
}: LoadingProps & {
  LoadingComponent: Class<React.Component<*, *>> | Function,
  render: Function
}) => {
  if (notFound) {
    return <NotFound />
  }

  if (notAuthorized) {
    return <NotAuthorized />
  }

  if (errored) {
    return <div className="errored">Error loading page</div>
  }

  if (!loaded) {
    return <LoadingComponent />
  }

  return <div className="loaded">{render()}</div>
}

export const withLoading = R.curry(
  (
    LoadingComponent: Class<React.Component<*, *>> | Function,
    LoadedComponent: Class<React.Component<*, *>>
  ) => {
    class WithLoading extends LoadedComponent {
      props: LoadingProps
      static WrappedComponent: Class<React.Component<*, *>>

      render() {
        const { loaded, errored, notAuthorized, notFound } = this.props

        return renderDeferredLoading({
          LoadingComponent,
          loaded,
          errored,
          notAuthorized,
          notFound,
          render: () => super.render()
        })
      }
    }

    WithLoading.WrappedComponent = LoadedComponent
    return WithLoading
  }
)

export const withSpinnerLoading = withLoading(Loading)
export const withPostLoading = withLoading(PostLoading)
