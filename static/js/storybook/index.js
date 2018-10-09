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
