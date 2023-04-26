import React, { useCallback } from "react"
import classNames from "classnames"
import * as NiceModal from "@ebay/nice-modal-react"
import { LearningResourceCardTemplate } from "ol-search-ui"
import type {
  LearningResourceCardTemplateProps,
  LearningResource,
  LearningResourceSearchResult
} from "ol-search-ui"
import { useActivateResourceDrawer } from "./LearningResourceDrawer"
import { imgConfigs } from "../util/constants"
import IconButton from "@mui/material/IconButton"
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder"
import BookmarkIcon from "@mui/icons-material/Bookmark"
import AddToListDialog from "../pages/user-lists/AddToListDialog"

type TemplateProps = LearningResourceCardTemplateProps<
  LearningResource | LearningResourceSearchResult
>
type LearningResourceCardProps = Pick<
  TemplateProps,
  "variant" | "resource" | "className" | "sortable" | "suppressImage"
>

const LearningResourceCard: React.FC<LearningResourceCardProps> = ({
  resource,
  variant,
  className,
  sortable,
  suppressImage
}) => {
  const activateResource = useActivateResourceDrawer()
  const showAddToListDialog = useCallback(() => {
    NiceModal.show(AddToListDialog, { resourceKey: resource })
  }, [resource])
  const { user } = SETTINGS
  const isInList = (resource.lists?.length ?? 0) > 0 || resource.is_favorite
  return (
    <>
      <LearningResourceCardTemplate
        variant={variant}
        sortable={sortable}
        suppressImage={suppressImage}
        className={classNames("ic-resource-card", className)}
        resource={resource}
        imgConfig={imgConfigs[variant]}
        onActivate={activateResource}
        footerActionSlot={
          user.is_authenticated && (
            <IconButton
              size="small"
              aria-label="Add to list"
              onClick={showAddToListDialog}
            >
              {isInList ? <BookmarkIcon /> : <BookmarkBorderIcon />}
            </IconButton>
          )
        }
      />
    </>
  )
}

export default LearningResourceCard
export type { LearningResourceCardProps }
