// @flow
/* global SETTINGS: false */
import React from "react"
import { MetaTags } from "react-meta-tags"

import Card from "../../components/Card"
import { CanonicalLink } from "ol-util"

import { formatTitle } from "../../lib/title"

import type { Match } from "react-router"

type Props = {
  match: Match
}

export default class ContentPolicyPage extends React.Component<Props> {
  render() {
    const { match } = this.props

    return (
      <div className="content content-policy-page">
        <MetaTags>
          <title>{formatTitle("Community Guidelines")}</title>
          <CanonicalLink match={match} />
        </MetaTags>
        <div className="main-content">
          <Card className="site-policy content-policy">
            <h1>Community Guidelines</h1>
            <p>
              MITx offers these discussion forums as a place for you to grow
              your understanding of learning topics and your connection with
              other learners. Please review the following considerations before
              you join the discussion.
            </p>
            <h4>DO:</h4>
            <ul>
              <li>
                Please be civil. Treat the conversation as if it were
                face-to-face. Hold yourself to the same standards of behavior
                online that you would follow in a real life discussion.
              </li>
              <li>
                Use meaningful titles for your posts. Keep them factual. When
                voicing an opinion or point of view on a topic, please support
                your opinion with relevant facts, and remember it’s one point of
                view among many.
              </li>
              <li>
                Please vote. If you think something contributes to conversation,
                upvote it. If you think it does not contribute to the channel it
                is posted in or is off-topic in a particular channel, downvote
                it.
              </li>
              <li>
                Moderate using voting or reporting based on post quality or
                accuracy, not based on opinion. Well-written and interesting
                content can be worthwhile, even if you disagree with it. If you
                have a contrasting point of view try to share it with the
                community in a productive way.
              </li>
              <li>
                Consider giving constructive criticism or an explanation when
                you downvote someone else’s post, and do so carefully and
                tactfully. When you do, please reply to the argument instead of
                calling names. "That is idiotic; 1 + 1 is 2, not 3" can be
                shortened to "1 + 1 is 2, not 3."
              </li>
              <li>
                State your reason for editing a post. Edited submissions are
                marked by an [edited by author] note. For example: a simple
                "Edit: spelling" will help explain. This avoids confusion when a
                post is edited after a conversation is built around it. If you
                have another thing to add to your original comment, say "Edit:
                And I also think..." or something along those lines.
              </li>
              <li>
                Read over your submission for mistakes before submitting,
                especially the title of the submission. Comments and the content
                of text posts can be edited after being submitted, however, the
                title of a post can't be. Make sure the facts you provide are
                accurate to avoid any confusion down the line.
              </li>
              <li>
                Read these rules and guidelines before posting for the first
                time. Read it again every once in a while.
              </li>
            </ul>

            <h4>DON'T:</h4>
            <ul>
              <li>
                Please don't do things to make titles stand out, like using
                uppercase or exclamation points, or words like urgent,
                important. It's implicit in posting something that you think
                it's important.
              </li>
              <li>
                Don't introduce flamewar topics unless you have something
                genuinely new to say. Avoid unrelated controversies and generic
                tangents.
              </li>
              <li>
                Please don't use uppercase for emphasis in your posts or
                comments. If you want to emphasize a word or phrase, put
                *asterisks* around it and it will get italicized.
              </li>
              <li>
                Do not post empty or useless responses, such as just lol or
                cool. Only post responses when you have something to contribute.
                You can use “up voting”.
              </li>
              <li>Please do not conduct personal attacks on other learners.</li>
              <li>
                Do not post content that contains personal, identifiable
                information or content embarrassing to others.
              </li>
            </ul>
          </Card>
        </div>
      </div>
    )
  }
}
