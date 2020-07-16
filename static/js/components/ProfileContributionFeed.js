// @flow
/* global SETTINGS:false */
import React from "react"
import { connect } from "react-redux"
import { NavLink } from "react-router-dom"
import R from "ramda"
import _ from "lodash"
import InfiniteScroll from "react-infinite-scroller"

import { Loading } from "../components/Loading"
import IntraPageNav from "../components/IntraPageNav"
import CompactPostDisplay from "../components/CompactPostDisplay"
import Comment from "../components/Comment"

import { actions } from "../actions"
import { POSTS_SORT_NEW } from "../lib/picker"
import { POSTS_OBJECT_TYPE, COMMENTS_OBJECT_TYPE } from "../lib/constants"
import { commentPermalink } from "../lib/url"
import { ORPHAN_COMMENTS_KEY } from "../reducers/comments"

import type { Dispatch } from "redux"
import type { Post } from "../flow/discussionTypes"
import type { UserContributionState } from "../reducers/user_contributions"

type OwnProps = {|
  userName: string,
  selectedTab: string
|}

type StateProps = {|
  contributions: UserContributionState,
  upvotedPosts: Map<string, Post>,
  canLoadMore: boolean,
  votedComments: Object
|}

type Props = {|
  ...OwnProps,
  ...StateProps,
  dispatch: Dispatch<*>
|}

const profileFeedDefaultParams = { sort: POSTS_SORT_NEW }
const tabs = [POSTS_OBJECT_TYPE, COMMENTS_OBJECT_TYPE]

class ProfileContributionFeed extends React.Component<Props> {
  componentDidMount() {
    const { contributions, selectedTab } = this.props

    if (!contributions || !contributions[selectedTab]) {
      this.loadData()
    }
  }

  componentDidUpdate() {
    const { contributions, selectedTab, canLoadMore } = this.props

    if (
      canLoadMore &&
      contributions &&
      contributions[selectedTab].loaded === false
    ) {
      this.loadData()
    }
  }

  loadData = async (params: Object) => {
    const { dispatch, userName, selectedTab } = this.props

    params = params || profileFeedDefaultParams
    await dispatch(actions.userContributions.get(selectedTab, userName, params))
  }

  loadMore = async () => {
    const { canLoadMore, contributions, selectedTab } = this.props

    if (!canLoadMore) {
      return
    }

    const pagination = contributions[selectedTab].pagination
    const paginationParams = {
      ...profileFeedDefaultParams,
      count: pagination.after_count,
      after: pagination.after
    }

    await this.loadData(paginationParams)
  }

  getUpdatedContributionsList = (
    objectKey: string,
    updatedObjects: Map<string, Object>
  ) => {
    const { contributions } = this.props
    return updatedObjects
      ? contributions[objectKey].data.map(contribution => {
        if (objectKey === POSTS_OBJECT_TYPE) {
          return updatedObjects.get(contribution.id) || contribution
        } else {
          return updatedObjects[contribution.id] || contribution
        }
      })
      : contributions[objectKey].data
  }

  renderContributionList = () => {
    const { upvotedPosts, votedComments, selectedTab } = this.props

    if (selectedTab === POSTS_OBJECT_TYPE) {
      const posts = this.getUpdatedContributionsList(
        POSTS_OBJECT_TYPE,
        upvotedPosts
      )
      if (R.isEmpty(posts)) {
        return (
          <div className="empty-list-msg">There are no posts to display.</div>
        )
      }
      return (
        <div className="post-list">
          {posts.map((post, i) => (
            <CompactPostDisplay
              key={i}
              post={post}
              isModerator={false}
              menuOpen={false}
              useSearchPageUI
            />
          ))}
        </div>
      )
    } else {
      const comments = this.getUpdatedContributionsList(
        COMMENTS_OBJECT_TYPE,
        votedComments
      )
      if (R.isEmpty(comments)) {
        return (
          <div className="empty-list-msg">
            There are no comments to display.
          </div>
        )
      }
      return (
        <div className="comment-list">
          {comments.map((comment, i) => (
            <Comment
              key={i}
              comment={comment}
              isModerator={false}
              isPrivateChannel={false}
              commentPermalink={commentPermalink(
                comment.channel_name,
                comment.post_id,
                comment.post_slug
              )}
              useSearchPageUI
            />
          ))}
        </div>
      )
    }
  }

  render() {
    const { contributions, selectedTab, userName } = this.props

    const contributionsLoading =
      !contributions || contributions[selectedTab].loaded === false

    return (
      <div>
        <IntraPageNav>
          {tabs.map(tabName => (
            <NavLink
              to={`/profile/${userName}/${tabName}`}
              activeClassName="active"
              isActive={() => {
                return selectedTab === tabName
              }}
              key={tabName}
            >
              {_.capitalize(tabName)}
            </NavLink>
          ))}
        </IntraPageNav>
        {contributionsLoading ? (
          <Loading className="infinite" />
        ) : (
          <InfiniteScroll
            hasMore={!!contributions[selectedTab].pagination.after}
            loadMore={this.loadMore}
            initialLoad={false}
            loader={<Loading className="infinite" key="loader" />}
          >
            {this.renderContributionList()}
          </InfiniteScroll>
        )}
      </div>
    )
  }
}

const mapStateToProps = (state, ownProps): StateProps => {
  const { userContributions, posts, comments } = state
  const contributions = userContributions.data.get(ownProps.userName)
  const upvotedPosts = posts.data
  const votedComments = comments.data.get(ORPHAN_COMMENTS_KEY) ?? {}
  const canLoadMore = !userContributions.processing
  return {
    contributions,
    upvotedPosts,
    canLoadMore,
    votedComments
  }
}

export default connect<Props, OwnProps, _, _, _, _>(mapStateToProps)(
  ProfileContributionFeed
)
