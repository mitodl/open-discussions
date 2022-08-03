import React from "react"

import { initials } from "ol-util"

import type { FieldChannel } from "../api/fields/interfaces"

export const AVATAR_SMALL = "small" as const
export const AVATAR_MEDIUM = "medium" as const
export const AVATAR_LARGE = "large" as const

type ImageSize =
  | typeof AVATAR_SMALL
  | typeof AVATAR_MEDIUM
  | typeof AVATAR_LARGE

type AvatarProps = {
  imageSize?: ImageSize
  field: FieldChannel
  editable?: boolean
  formImageUrl?: string | null
  name?: string
}

const getImage = (field: FieldChannel, imageSize: ImageSize | undefined) => {
  switch (imageSize) {
  case AVATAR_LARGE:
    return field.avatar
  case AVATAR_SMALL:
    return field.avatar_small
  default:
    return field.avatar_medium
  }
}

const FieldAvatar: React.FC<AvatarProps> = props => {
  const { field, formImageUrl, imageSize } = props

  const imageUrl = formImageUrl || getImage(field, imageSize)
  const isDefault = !imageUrl

  return (
    <div className={`avatar-container row ${imageSize}-size`}>
      <div className="avatar">
        {isDefault ? (
          <div className="avatar-initials">{initials(field.title)}</div>
        ) : (
          <img
            src={imageUrl}
            alt={`Channel avatar for ${field.title}`}
            className={`avatar-image`}
          />
        )}
      </div>
    </div>
  )
}

export default FieldAvatar
