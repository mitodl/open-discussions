/* global SETTINGS */
import React from "react"
import { storiesOf } from "@storybook/react"
import { action } from "@storybook/addon-actions"
import { withKnobs, text, boolean, number } from "@storybook/addon-knobs"
import { MemoryRouter } from "react-router"
import { Provider } from "react-redux"
import { createStoreWithMiddleware } from "../store/configureStore"
import casual from "casual-browserify"

import "../../scss/layout.scss"
import { editCommentKey, replyToCommentKey } from "../components/CommentForms"
import { makePost } from "../factories/posts"
import { makeChannel } from "../factories/channels"
import { makeCommentsResponse, makeMoreComments } from "../factories/comments"
import { dropdownMenuFuncs } from "../lib/ui"
import { commentPermalink } from "../lib/url"
import { createCommentTree } from "../reducers/comments"

import BackButton from "../components/BackButton"
import Card from "../components/Card"
import CloseButton from "../components/CloseButton"
import { CompactPostDisplay } from "../components/CompactPostDisplay"
import CommentTree, {
  commentDropdownKey,
  commentShareKey
} from "../components/CommentTree"
import rootReducer from "../reducers"

// Set up a reducer with two custom actions to wipe and replace all data
const RESET_STATE = "RESET_STATE"
const SET_NEW_STATE = "SET_NEW_STATE"
const reducer = (state, action) => {
  if (action.type === RESET_STATE) {
    state = undefined
  } else if (action.type === SET_NEW_STATE) {
    state = {
      ...state,
      ...action.payload
    }
  }

  return rootReducer(state, action)
}

// This needs to be created here. If it's defined in a method or decorator it will be recreated on each reload,
// which react-redux will complain about.
const store = createStoreWithMiddleware(reducer)

const setReducerState = newState => {
  store.dispatch({
    type:    SET_NEW_STATE,
    payload: newState
  })
}

const StoryWrapper = ({ children, style = {} }) => (
  <div style={{ width: "500px", margin: "50px auto", ...style }}>
    {children}
  </div>
)

const withSettings = story => {
  global.SETTINGS = {}
  return story()
}

const withRandom = story => {
  casual.seed(123)
  return story()
}

const withRedux = story => {
  store.dispatch({ type: RESET_STATE })
  return <Provider store={store}>{story()}</Provider>
}

const withRouter = story => <MemoryRouter>{story()}</MemoryRouter>

storiesOf("BackButton", module)
  .add("with a class name", () => (
    <StoryWrapper>
      <BackButton onClick={action("clicked")} className="foobarbaz" />
    </StoryWrapper>
  ))
  .add("with no class name", () => (
    <StoryWrapper>
      <BackButton onClick={action("clicked")} />
    </StoryWrapper>
  ))

storiesOf("Card", module)
  .addDecorator(withKnobs)
  .add("with title", () => {
    const title = text("Title", "My Great Card")

    return (
      <StoryWrapper>
        <Card title={title}>
          <p>some text</p>
        </Card>
      </StoryWrapper>
    )
  })
  .add("without a title", () => (
    <StoryWrapper>
      <Card>
        <p>some text</p>
      </Card>
    </StoryWrapper>
  ))

storiesOf("CloseButton", module).add("basic display", () => (
  <StoryWrapper style={{ position: "relative" }}>
    <CloseButton onClick={action("clicked")} />
  </StoryWrapper>
))

const textContentKnob = () => text("textContent", "click me!")
const urlKnob = () => text("url", "http://en.wikipedia.org/wiki/Elephant")

storiesOf("Links and Buttons", module)
  .addDecorator(withKnobs)
  .add("basic link", () => {
    const textContent = textContentKnob()
    const url = urlKnob()

    return (
      <StoryWrapper>
        <a href={url}>{textContent}</a>
      </StoryWrapper>
    )
  })
  .add("navy link", () => {
    const textContent = textContentKnob()
    const url = urlKnob()

    return (
      <StoryWrapper>
        <a className="navy" href={url}>
          {textContent}
        </a>
      </StoryWrapper>
    )
  })
  .add("grey link", () => {
    const textContent = textContentKnob()
    const url = urlKnob()

    return (
      <StoryWrapper>
        <a className="grey" href={url}>
          {textContent}
        </a>
      </StoryWrapper>
    )
  })
  .add("no-underline link", () => {
    const textContent = textContentKnob()
    const url = urlKnob()

    return (
      <StoryWrapper>
        <a className="no-underline" href={url}>
          {textContent}
        </a>
      </StoryWrapper>
    )
  })
  .add("basic button", () => {
    const textContent = textContentKnob()

    return (
      <StoryWrapper>
        <button onClick={action("clicked")}>{textContent}</button>
      </StoryWrapper>
    )
  })
  .add("outlined button", () => {
    const textContent = textContentKnob()

    return (
      <StoryWrapper>
        <button className="outlined" onClick={action("clicked")}>
          {textContent}
        </button>
      </StoryWrapper>
    )
  })
  .add("dark-outlined button", () => {
    const textContent = textContentKnob()

    return (
      <StoryWrapper>
        <button className="dark-outlined" onClick={action("clicked")}>
          {textContent}
        </button>
      </StoryWrapper>
    )
  })
  .add("compact button", () => {
    const textContent = textContentKnob()

    return (
      <StoryWrapper>
        <button className="compact" onClick={action("clicked")}>
          {textContent}
        </button>
      </StoryWrapper>
    )
  })

const fakeUrl = (prefix, id) =>
  `https://avatars.dicebear.com/v2/identicon/${prefix}_${id}.svg`

const postStories = storiesOf("Post", module)
  .addDecorator(withRandom)
  .addDecorator(withRouter)
  .addDecorator(withSettings)
  .addDecorator(withKnobs)
;[[true, "url post"], [false, "text post"]].forEach(([isUrl, storyName]) => {
  postStories.add(storyName, () => {
    const menuOpen = boolean("Menu open", false)
    const showPinUI = boolean("Show pin UI", false)
    const showChannelLink = boolean("Show channel link", false)
    const isAnonymous = boolean("As anonymous", false)
    const isModerator = boolean("As moderator", false)

    const post = makePost(isUrl)
    post.profile_url = fakeUrl("pr", post.author_id)
    if (isUrl) {
      post.thumbnail = fakeUrl("th", post.author_id)
    }
    if (!isAnonymous) {
      SETTINGS.username = "user"
    }
    post.stickied = showPinUI

    return (
      <StoryWrapper>
        <CompactPostDisplay
          post={post}
          menuOpen={menuOpen}
          showChannelLink={showChannelLink}
          showPinUI={showPinUI}
          removePost={action("remove post")}
          ignorePostReports={action("ignore post reports")}
          reportPost={action("report post")}
          togglePinPost={action("pin")}
          isModerator={isModerator}
        />
      </StoryWrapper>
    )
  })
})

storiesOf("Comment", module)
  .addDecorator(withRandom)
  .addDecorator(withRouter)
  .addDecorator(withRedux)
  .addDecorator(withSettings)
  .addDecorator(withKnobs)
  .add("comment", () => {
    const menuOpen = boolean("Menu open", false)
    const shareMenuOpen = boolean("Share menu open", false)
    const isEditing = boolean("Show edit form", false)
    const isReply = boolean("Show reply form", false)
    const deleted = boolean("Deleted", false)
    const removed = boolean("Removed", false)
    const moderationUI = boolean("Reported comments UI", false)
    const isPrivateChannel = boolean("Is private channel", false)
    const numReports = number("Number of reports", 0)
    const isAnonymous = boolean("As anonymous", false)
    const userIsAuthor = boolean("As comment author", false)
    const isModerator = boolean("As moderator", false)

    // The comments aren't broken out into pieces so it's easier just to render the CommentTree with only one comment
    const channel = makeChannel()
    const post = makePost(false, channel)
    const responses = makeCommentsResponse(post, 1, 3, 3)
    const comment = {
      ...createCommentTree(responses)[0],
      profile_image: fakeUrl("pr", responses[0].author_id),
      replies:       [],
      children:      [],
      num_comments:  0
    }
    const comments = [comment]

    const dropdownMenus = new Set()
    if (menuOpen) {
      dropdownMenus.add(commentDropdownKey(comment))
    }
    if (shareMenuOpen) {
      dropdownMenus.add(commentShareKey(comment))
    }
    comment.deleted = deleted
    comment.removed = removed
    comment.num_reports = numReports

    const forms = {}
    if (isEditing) {
      forms[editCommentKey(comment)] = {}
    }
    if (isReply) {
      forms[replyToCommentKey(comment)] = {}
    }
    setReducerState({ forms })

    if (!isAnonymous) {
      SETTINGS.username = userIsAuthor ? comment.author_id : "user"
    }
    return (
      <StoryWrapper store={store}>
        <CommentTree
          comments={comments}
          commentPermalink={commentPermalink(channel.name, post.id, post.slug)}
          curriedDropdownMenufunc={dropdownMenuFuncs(action("clicked"))}
          isModerator={isModerator}
          loadMoreComments={action("load more comments")}
          dropdownMenus={dropdownMenus}
          moderationUI={moderationUI}
          upvote={action("upvote")}
          downvote={action("downvote")}
          isPrivateChannel={isPrivateChannel}
          beginEditing={action("begin editing")}
          reportComment={action("report")}
          ignoreCommentReports={action("ignore reports")}
          deleteComment={action("delete")}
          approve={action("approve")}
          remove={action("remove")}
          forms={forms}
        />
      </StoryWrapper>
    )
  })
  .add("load more comments", () => {
    // The comments aren't broken out into pieces so it's easier just to render the CommentTree with only one comment
    const channel = makeChannel()
    const post = makePost(false, channel)
    const responses = [makeMoreComments(post)]
    const comments = [createCommentTree(responses)[0]]

    return (
      <StoryWrapper>
        <CommentTree
          comments={comments}
          commentPermalink={commentPermalink(channel.name, post.id, post.slug)}
          curriedDropdownMenufunc={dropdownMenuFuncs(action("clicked"))}
          dropdownMenus={new Set()}
          isModerator={boolean("Is moderator", false)}
          loadMoreComments={action("load more comments")}
        />
      </StoryWrapper>
    )
  })
  .add("tree", () => {
    const channel = makeChannel()
    const post = makePost(false, channel)
    const responses = makeCommentsResponse(post, 1, 3, 3).map(response => ({
      ...response,
      profile_image: fakeUrl("tr", response.id)
    }))
    const comments = createCommentTree(responses)

    return (
      <StoryWrapper>
        <CommentTree
          comments={comments}
          commentPermalink={commentPermalink(channel.name, post.id, post.slug)}
          curriedDropdownMenufunc={dropdownMenuFuncs(action("clicked"))}
          dropdownMenus={new Set()}
        />
      </StoryWrapper>
    )
  })
