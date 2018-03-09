/* global SETTINGS:false */
// @flow
import React from "react"

const UserInfo = () =>
  SETTINGS.user_full_name && SETTINGS.profile_image_small
    ? <div className="user-info">
      <img className="profile-image" src={SETTINGS.profile_image_small} />
      <span>
        {SETTINGS.user_full_name}{" "}
      </span>
    </div>
    : null

export default UserInfo
