import React from "react"
import { storiesOf } from "@storybook/react"
import { action } from "@storybook/addon-actions"
import { withKnobs, text } from "@storybook/addon-knobs"

import "../../scss/layout.scss"

import BackButton from "../components/BackButton"
import Card from "../components/Card"
import CloseButton from "../components/CloseButton"

const StoryWrapper = ({ children, style = {} }) => (
  <div style={{ width: "500px", margin: "50px auto", ...style }}>
    {children}
  </div>
)

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
