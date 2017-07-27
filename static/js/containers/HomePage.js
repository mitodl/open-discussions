// @flow
import React from "react"
import { connect } from "react-redux"

import PostList from "../components/PostList"
import Card from "../components/Card"

import { actions } from "../actions"
import { setPostData } from "../actions/post"
import { safeBulkGet } from "../lib/maps"
import { toggleUpvote } from "../util/api_actions"

class HomePage extends React.Component {
  componentWillMount() {
    this.fetchFrontpage()
  }

  fetchFrontpage = () => {
    const { dispatch } = this.props

    dispatch(actions.frontpage.get()).then(posts => {
      dispatch(setPostData(posts))
    })
  }

  render() {
    const { posts, frontpage, dispatch } = this.props
    const dispatchableToggleUpvote = toggleUpvote(dispatch)

    return (
      <div className="double-column">
        <div className="first-column">
          <Card title="Home Page">
            <PostList
              posts={safeBulkGet(frontpage.data, posts.data)}
              toggleUpvote={dispatchableToggleUpvote}
              showChannelLinks={true}
            />
          </Card>
        </div>
        <div className="second-column" />
        <br className="clear" />
      </div>
    )
  }
}

const mapStateToProps = state => {
  return {
    posts:     state.posts,
    frontpage: state.frontpage
  }
}

export default connect(mapStateToProps)(HomePage)
