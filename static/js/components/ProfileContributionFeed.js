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

import type { Dispatch } from "redux"
import type { CommentInTree, Post } from "../flow/discussionTypes"
import type { UserContributionState } from "../reducers/user_contributions"

type OwnProps = {|
  userName: string,
  selectedTab: string
|}

type StateProps = {|
  contributions: UserContributionState,
  upvotedPosts: Map<string, Post>,
  canLoadMore: boolean
|}

type Props = {|
  ...OwnProps,
  ...StateProps,
  dispatch: Dispatch<*>
|}

type State = {
  votedComments: Map<string, CommentInTree>
}

const profileFeedDefaultParams = { sort: POSTS_SORT_NEW }
const tabs = [POSTS_OBJECT_TYPE, COMMENTS_OBJECT_TYPE]

class ProfileContributionFeed extends React.Component<Props, State> {
  constructor() {
    super()
    this.state = {
      votedComments: new Map()
    }
  }

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

  updateVotedComments = (comment: CommentInTree) => {
    const { votedComments } = this.state
    const upvotedCommentMap = new Map(votedComments)
    upvotedCommentMap.set(comment.id, comment)
    this.setState({ votedComments: upvotedCommentMap })
  }

  setCommentVote = R.curry(
    async (voteStatusName: string, comment: CommentInTree) => {
      const { dispatch } = this.props
      const updatedComment = await dispatch(
        actions.comments.patch(comment.id, {
          [voteStatusName]: !comment[voteStatusName]
        })
      )
      this.updateVotedComments(updatedComment)
    }
  )

  upvoteComment = this.setCommentVote("upvoted")

  downvoteComment = this.setCommentVote("downvoted")

  getUpdatedContributionsList = (
    objectKey: string,
    updatedObjects: Map<string, Object>
  ) => {
    const { contributions } = this.props
    return updatedObjects
      ? contributions[objectKey].data.map(
        contribution => updatedObjects.get(contribution.id) || contribution
      )
      : contributions[objectKey].data
  }

  renderContributionList = () => {
    const { upvotedPosts, selectedTab } = this.props
    const { votedComments } = this.state

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
  const { userContributions, posts } = state
  const contributions = userContributions.data.get(ownProps.userName)
  const upvotedPosts = posts.data
  const canLoadMore = !userContributions.processing
  return {
    contributions,
    upvotedPosts,
    canLoadMore
  }
}

export default connect<Props, OwnProps, _, _, _, _>(mapStateToProps)(
  ProfileContributionFeed
)
