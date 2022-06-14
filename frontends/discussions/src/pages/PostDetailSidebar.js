// @flow
/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import { connect } from "react-redux"
import { Link } from "react-router-dom"

import { actions } from "../actions"
import { Loading } from "../components/Loading"
import Card from "../components/Card"
import { LINK_TYPE_LINK } from "../lib/channels"
import { postDetailURL, profileURL, channelURL } from "../lib/url"

import type { Dispatch } from "redux"
import type { PostResult } from "../flow/searchTypes"
import type { Post } from "../flow/discussionTypes"

type StateProps = {|
  relatedPosts: Array<PostResult>,
  loading: boolean
|}

type OwnProps = {|
  post: Post
|}

type Props = {|
  dispatch: Dispatch<*>,
  ...OwnProps,
  ...StateProps
|}

export class PostDetailSidebar extends React.Component<Props> {
  componentDidMount() {
    this.loadData()
  }

  componentDidUpdate(prevProps: Props) {
    if (!R.equals(prevProps.post, this.props.post)) {
      this.loadData()
    }
  }

  loadData = async () => {
    const { dispatch, post, loading } = this.props
    if (post && !loading) {
      await dispatch(actions.relatedPosts.post(post.id))
    }
  }

  render() {
    const { loading, relatedPosts } = this.props

    if (loading) {
      return <Loading />
    }
    if (!relatedPosts || relatedPosts.length === 0) {
      return null
    }

    return (
      <Card className="related-posts">
        <h3>Similar Posts</h3>
        {relatedPosts.map((post: PostResult) => (
          <div key={post.post_id} className="related-post-item">
            {post.post_type === LINK_TYPE_LINK ? (
              <a
                href={post.post_link_url}
                className="external-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="material-icons open_in_new">open_in_new</i>
              </a>
            ) : null}
            <Link
              to={postDetailURL(
                post.channel_name,
                post.post_id,
                post.post_slug
              )}
              className="title-link"
            >
              {post.post_title}
            </Link>
            <div className="detail">
              <Link to={profileURL(post.author_id)}>{post.author_name}</Link>{" "}
              <span className="in">in</span>{" "}
              <Link to={channelURL(post.channel_name)}>
                {post.channel_title}
              </Link>
            </div>
          </div>
        ))}
      </Card>
    )
  }
}

const mapStateToProps = (state: Object): StateProps => {
  const { relatedPosts } = state

  return {
    loading:      relatedPosts.processing,
    relatedPosts: relatedPosts.data
  }
}

export default connect<Props, OwnProps, _, _, _, _>(mapStateToProps)(
  PostDetailSidebar
)
