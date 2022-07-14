// @flow
import React from "react"
import R from "ramda"
import ContentLoader from "react-content-loader"

import { NotFound, NotAuthorized } from "./ErrorPages"
import { Card } from "ol-util" 
import { Cell, Grid } from "./Grid"

import { contentLoaderSpeed } from "../lib/constants"
import { EMBEDLY_THUMB_HEIGHT } from "../lib/posts"
import {
  SEARCH_GRID_UI,
  SEARCH_LIST_UI,
  SEARCH_UI_GRID_WIDTHS
} from "../lib/search"
import { useDeviceCategory } from "../hooks/util"

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

const AnimatedEmptyCard = () => (
  <div className="post-content-loader">
    <Card className="compact-post-summary">
      <ContentLoader
        speed={contentLoaderSpeed}
        style={{ width: "100%", height: "137px" }}
        width={1000}
        height={137}
        preserveAspectRatio="none"
      >
        <rect x="0" y="0" rx="5" ry="5" width="60%" height="20" />
        <rect x="0" y="40" rx="5" ry="5" width="60%" height="16" />
        <rect x="0" y="58" rx="5" ry="5" width="60%" height="16" />
        <rect x="0" y="113" rx="5" ry="5" width="170" height="24" />
        <rect
          x="66%"
          y="0"
          rx="5"
          ry="5"
          width="34%"
          height={EMBEDLY_THUMB_HEIGHT}
        />
      </ContentLoader>
    </Card>
  </div>
)

const AnimatedEmptyLRPortrait = () => (
  <Card className="borderless lr-portrait-loader">
    <ContentLoader
      speed={contentLoaderSpeed}
      style={{ width: "100%", height: "354px" }}
      width={1000}
      height={354}
      preserveAspectRatio="none"
    >
      <rect x="0" y="0" rx="5" ry="5" width="100%" height="171" />
      <rect x="60" y="190" rx="5" ry="5" width="250" height="13" />
      <rect x="60" y="210" rx="5" ry="5" width="60%" height="24" />

      <rect x="60" y="250" rx="5" ry="5" width="75%" height="15" />
      <rect x="60" y="270" rx="5" ry="5" width="85%" height="15" />

      <rect x="60" y="315" rx="25" ry="25" width="180" height="20" />
      <rect x="280" y="315" rx="25" ry="25" width="250" height="20" />
      <rect x="85%" y="315" rx="25" ry="25" width="10%" height="20" />
    </ContentLoader>
  </Card>
)

export const PostLoading = () => (
  <div className="card-list-loader">
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
    {R.times(
      i => (
        <AnimatedEmptyCard key={i} />
      ),
      emptyPostsToRender
    )}
  </div>
)

export const PodcastEpisodeLoading = () =>
  R.times(
    i => (
      <Card key={i}>
        <ContentLoader
          speed={contentLoaderSpeed}
          style={{ width: "100%", height: "74px" }}
          width={1000}
          height={74}
          preserveAspectRatio="none"
        >
          <rect x="0" y="0" rx="5" ry="5" width="60%" height="12" />
          <rect x="0" y="25" rx="5" ry="5" width="30%" height="14" />
          <rect x="0" y="55" rx="15" ry="15" width="140" height="18" />
          <rect x="66%" y="0" rx="5" ry="5" width="34%" height={69} />
        </ContentLoader>
      </Card>
    ),
    6
  )

export const PodcastLoading = () => (
  <Grid>
    {R.times(
      i => (
        <Cell width={4} key={i}>
          <Card className="borderless">
            <ContentLoader
              speed={contentLoaderSpeed}
              style={{ width: "100%", height: "280px" }}
              width={1000}
              height={280}
              preserveAspectRatio="none"
            >
              <rect x="0" y="0" rx="5" ry="5" width="100%" height={180} />
              <rect x="30" y="190" rx="5" ry="5" width="20%" height="12" />
              <rect x="30" y="210" rx="5" ry="5" width="80%" height="18" />
              <rect x="30" y="260" rx="15" ry="15" width="30%" height="12" />
            </ContentLoader>
          </Card>
        </Cell>
      ),
      9
    )}
  </Grid>
)

type CSLProps = {
  layout: string
}

export const CourseSearchLoading = ({ layout }: CSLProps) => (
  <Grid className="card-list-loader">
    {R.times(
      i => (
        <Cell width={layout === SEARCH_GRID_UI ? 4 : 12} key={i}>
          {layout === SEARCH_LIST_UI ? (
            <AnimatedEmptyCard />
          ) : (
            <AnimatedEmptyLRPortrait />
          )}
        </Cell>
      ),
      10
    )}
  </Grid>
)

export const CarouselLoading = () => {
  const deviceCategory = useDeviceCategory()
  const width = SEARCH_UI_GRID_WIDTHS[deviceCategory]

  return (
    <div className="course-carousel-loader">
      <ContentLoader
        speed={contentLoaderSpeed}
        style={{ width: "100%", height: "30px" }}
        width={1000}
        height={30}
        preserveAspectRatio="none"
      >
        <rect x="0" y="0" rx="5" ry="5" width="15%" height="22" />
        <rect x="83%" y="0" rx="5" ry="5" width="8%" height="22" />
        <rect x="92%" y="0" rx="5" ry="5" width="8%" height="22" />
      </ContentLoader>
      <div className="loader-row">
        {R.times(
          i => (
            <AnimatedEmptyLRPortrait key={i} />
          ),
          width
        )}
      </div>
    </div>
  )
}

export const SearchLoading = () => (
  <Grid className="main-content two-column search-page">
    <Cell width={8}>{PostLoading()}</Cell>
  </Grid>
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
export const withSearchLoading = withLoading(SearchLoading)
