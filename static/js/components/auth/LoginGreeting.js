// @flow
/* global SETTINGS:false */
import React from "react"

type LoginGreetingProps = {
  email: string,
  name: ?string,
  profileImageUrl: ?string
}

const LoginGreeting = ({
  email,
  name,
  profileImageUrl
}: LoginGreetingProps) => {
  const heading = name ? `Hi ${name}` : "Welcome Back!"

  return (
    <div>
      <h3>{heading}</h3>
      {name && profileImageUrl ? (
        <div key="greeting-body" className="form-header">
          <div className="row profile-image-email">
            <img
              src={profileImageUrl}
              alt={`Profile image for ${name}`}
              className="profile-image small"
            />
            <span>{email}</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default LoginGreeting
