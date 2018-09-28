// @flow
/* global SETTINGS: false */
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import qs from "query-string"
import { MetaTags } from "react-meta-tags"
import { Link } from "react-router-dom"

import Card from "../components/Card"
import CanonicalLink from "../components/CanonicalLink"
import { withPostLoading } from "../components/Loading"
import withSingleColumn from "../hoc/withSingleColumn"
import { PostSortPicker } from "../components/SortPicker"
import {
  withPostModeration,
  postModerationSelector
} from "../hoc/withPostModeration"
import withPostList from "../hoc/withPostList"
import IntraPageNav from "../components/IntraPageNav"

import { actions } from "../actions"
import { setPostData } from "../actions/post"
import { safeBulkGet } from "../lib/maps"
import { getPostIds } from "../lib/posts"
import { getSubscribedChannels } from "../lib/redux_selectors"
import { updatePostSortParam, POSTS_SORT_HOT } from "../lib/sorting"
import { REGISTER_URL, newPostURL } from "../lib/url"
import { logoImageSrc } from "../lib/ui"

import type { Match } from "react-router"
import type { Dispatch } from "redux"
import type { Location } from "react-router"
import type { RestState } from "../flow/restTypes"
import type { Channel, Post, PostListPagination } from "../flow/discussionTypes"

// querystring doesn't match
const shouldLoadData = R.complement(R.eqBy(R.path(["location", "search"])))

type Props = {
  match: Match,
  location: Location,
  dispatch: Dispatch<any>,
  posts: Array<Post>,
  subscribedChannels: RestState<Array<string>>,
  channels: RestState<Map<string, Channel>>,
  showSidebar: boolean,
  pagination: PostListPagination,
  reportPost: (p: Post) => void,
  canLoadMore: boolean,
  renderPosts: Function,
  loadPosts: (search: PostListPagination) => Promise<*>
}

export class HomePage extends React.Component<Props> {
  componentDidMount() {
    this.loadData()
  }

  componentWillUnmount() {
    this.clearData()
  }

  componentDidUpdate(prevProps: Props) {
    if (shouldLoadData(prevProps, this.props)) {
      this.clearData()
      this.loadData()
    }
  }

  clearData = () => {
    const { dispatch } = this.props
    dispatch(actions.frontpage.clear())
  }

  loadData = async () => {
    const {
      loadPosts,
      location: { search }
    } = this.props

    await loadPosts(qs.parse(search))
  }

  renderIntroCard() {
    let headerText, buttonText, buttonLinkHref
    if (SETTINGS.username) {
      headerText = "Welcome Back!"
      buttonText = "Create a post"
      buttonLinkHref = newPostURL()
    } else {
      headerText = "Learn. Share. Connect."
      buttonText = "Become a member"
      buttonLinkHref = REGISTER_URL
    }

    return (
      <Card className="home-callout">
        <div className="logo-col">
          <img src={logoImageSrc()} alt="MIT Logo" />
        </div>
        <div className="text-col">
          <h3>{headerText}</h3>
          <p>
            A place where learners, teachers and scientists worldwide meet with
            MIT.
          </p>
        </div>
        <div className="action-col">
          <Link className="link-button" to={buttonLinkHref}>
            {buttonText}
          </Link>
        </div>
      </Card>
    )
  }

  render() {
    const {
      location: { search },
      match,
      renderPosts
    } = this.props

    return (
      <React.Fragment>
        <MetaTags>
          <CanonicalLink match={match} />
        </MetaTags>
        {this.renderIntroCard()}
        <IntraPageNav>
          <a href="#" className="active">
            Posts
          </a>
        </IntraPageNav>
        <div className="post-list-title">
          <div>Home</div>
          <PostSortPicker
            updateSortParam={updatePostSortParam(this.props)}
            value={qs.parse(search).sort || POSTS_SORT_HOT}
          />
        </div>
        {renderPosts()}
      </React.Fragment>
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  const frontpage = state.frontpage.data
  const posts = state.posts.data

  return {
    ...postModerationSelector(state, ownProps),
    posts:              safeBulkGet(getPostIds(frontpage), posts),
    subscribedChannels: getSubscribedChannels(state),
    pagination:         frontpage.pagination,
    channels:           state.channels,
    showSidebar:        state.ui.showSidebar,
    loaded:             state.frontpage.loaded || state.frontpage.data.postIds.length > 0,
    canLoadMore:        state.frontpage.loaded,
    showPinUI:          false,
    showReportPost:     true,
    showRemovePost:     false,
    showTogglePinPost:  false,
    showChannelLinks:   true,
    isModerator:        false // for the intents of CompactPostDisplay UI
  }
}

const mapDispatchToProps = (dispatch: Dispatch<any>) => ({
  loadPosts: async (search: Object) => {
    const response = await dispatch(actions.frontpage.get(search))
    dispatch(setPostData(response.posts))
  },
  dispatch: dispatch
})

export default R.compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  withPostModeration,
  withSingleColumn("home-page"),
  withPostList,
  withPostLoading
)(HomePage)
