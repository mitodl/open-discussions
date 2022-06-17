// @flow
/* global SETTINGS:false */
import React from "react"

import BackButton from "../BackButton"

type LoginGreetingProps = {
  email: string,
  name: ?string,
  profileImageUrl: ?string,
  onBackButtonClick: Function
}

const LoginGreeting = ({
  email,
  name,
  profileImageUrl,
  onBackButtonClick
}: LoginGreetingProps) => {
  const headingText = name ? `Hi ${name}` : "Welcome Back!"
  const body =
    name && profileImageUrl ? (
      <div className="profile-image-email">
        <img
          src={profileImageUrl}
          alt={`Profile image for ${name}`}
          className="profile-image small"
        />
        <span>{email}</span>
      </div>
    ) : null

  return (
    <React.Fragment>
      <div className="login-greeting-header">
        <BackButton onClick={onBackButtonClick} />
        <h3>{headingText}</h3>
      </div>
      <div>{body}</div>
    </React.Fragment>
  )
}

export default LoginGreeting
