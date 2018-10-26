// @flow
/* global SETTINGS:false */
import React from "react"
import ReCAPTCHA from "react-google-recaptcha"
import styled from "styled-components"
import debounce from "lodash/debounce"

import { validationMessage } from "../../lib/validation"

import type { EmailForm } from "../../flow/authTypes"
import type { FormProps } from "../../flow/formTypes"

type Props = {
  submitLabel?: string
} & FormProps<EmailForm>
type State = {
  recaptchaScale: number
}

// These needs to stay in sync with ReCAPTCHA's runtime width
const RECAPTCHA_NATURAL_WIDTH = 304
const RECAPTCHA_NATURAL_HEIGHT = 78

const StyledReCAPTCHA = styled(ReCAPTCHA)`
  transform: scale(${props => props.scale.toFixed(3)});
  transform-origin: 0 0;
  height: ${props => (props.scale * RECAPTCHA_NATURAL_HEIGHT).toFixed(0)}px;
`

class AuthEmailForm extends React.Component<Props, State> {
  recaptcha: null

  constructor(props: Props) {
    super(props)
    this.recaptcha = null
    // only rescale up to 4x a second to salvage some performance
    this.scaleRecaptcha = debounce(this.scaleRecaptcha.bind(this), 250)
    this.state = {
      recaptchaScale: 1.0
    }
  }

  componentDidMount() {
    window.addEventListener("resize", this.scaleRecaptcha)
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.scaleRecaptcha)
  }

  scaleRecaptcha = () => {
    if (this.recaptcha) {
      const {
        captcha: { clientWidth }
      } = this.recaptcha
      // compute this as a fractional scale of the scale that ReCAPTCHA wants to render at if our container is smaller
      const recaptchaScale =
        clientWidth < RECAPTCHA_NATURAL_WIDTH
          ? clientWidth / RECAPTCHA_NATURAL_WIDTH
          : 1.0

      this.setState({ recaptchaScale })
    }
  }

  setRecaptcha = (recaptcha: any) => {
    this.recaptcha = recaptcha
    this.scaleRecaptcha()
  }

  render() {
    const {
      form,
      validation,
      onSubmit,
      onUpdate,
      onRecaptcha,
      processing,
      submitLabel
    } = this.props
    const { recaptchaScale } = this.state

    return (
      <form onSubmit={onSubmit} className="form">
        <div className="emailfield row">
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={onUpdate}
            placeholder="Email"
          />
          {validationMessage(validation.email)}
        </div>
        {SETTINGS.recaptchaKey && onRecaptcha ? (
          <div className="recaptcha row">
            <StyledReCAPTCHA
              ref={this.setRecaptcha}
              sitekey={SETTINGS.recaptchaKey}
              onChange={onRecaptcha}
              scale={recaptchaScale}
            />
            {validationMessage(validation.recaptcha)}
          </div>
        ) : null}
        <div className="actions row right-aligned">
          <button
            type="submit"
            className={`submit-login ${processing ? "disabled" : ""}`}
            disabled={processing}
          >
            {submitLabel || "Next"}
          </button>
        </div>
      </form>
    )
  }
}

export default AuthEmailForm
