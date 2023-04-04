import React from "react"
import classNames from "classnames"
import { LearningResourceCardTemplate } from "ol-search-ui"
import type {
  LearningResourceCardTemplateProps,
  LearningResource
} from "ol-search-ui"
import { useActivateResourceDrawer } from "./LearningResourceDrawer"
import { imgConfigs } from "../util/constants"
import IconButton from "@mui/material/IconButton"
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder"
import BookmarkIcon from "@mui/icons-material/Bookmark"
import AddToListDialog, {
  useAddToListDialog
} from "../pages/user-lists/AddToListDialog"

type TemplateProps = LearningResourceCardTemplateProps<
  Omit<LearningResource, "topics">
>
type LearningResourceCardProps = Pick<
  TemplateProps,
  "variant" | "resource" | "className"
>

const LearningResourceCard: React.FC<LearningResourceCardProps> = ({
  resource,
  variant,
  className
}) => {
  const activateResource = useActivateResourceDrawer()
  const addToList = useAddToListDialog()
  const { user } = SETTINGS
  const isInList = resource.lists.length > 0 || resource.is_favorite
  return (
    <>
      <LearningResourceCardTemplate
        variant={variant}
        className={classNames("ic-resource-card", className)}
        resource={resource}
        imgConfig={imgConfigs[variant]}
        onActivate={activateResource}
        footerActionSlot={
          user.is_authenticated && (
            <IconButton
              size="small"
              aria-label="Add to list"
              onClick={() => addToList.open(resource)}
            >
              {isInList ? <BookmarkIcon /> : <BookmarkBorderIcon />}
            </IconButton>
          )
        }
      />
      {addToList.ressourceKey && (
        <AddToListDialog
          resourceKey={addToList.ressourceKey}
          onClose={addToList.close}
          open={addToList.isOpen}
          onExited={addToList.onExited}
        />
      )}
    </>
  )
}

export default LearningResourceCard
export type { LearningResourceCardProps }
