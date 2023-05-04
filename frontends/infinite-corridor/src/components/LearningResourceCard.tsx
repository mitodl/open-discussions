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
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd"
import AddToListDialog from "../pages/resource-lists/AddToListDialog"

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
    NiceModal.show(AddToListDialog, { resourceKey: resource, mode: "userlist" })
  }, [resource])
  const showAddToStaffListDialog = useCallback(() => {
    NiceModal.show(AddToListDialog, {
      resourceKey: resource,
      mode:        "stafflist"
    })
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
          <div>
            {user.is_staff_list_editor && (
              <IconButton
                size="small"
                aria-label="Add to MIT lists"
                onClick={showAddToStaffListDialog}
              >
                <PlaylistAddIcon />
              </IconButton>
            )}
            {user.is_authenticated && (
              <IconButton
                size="small"
                aria-label="Add to my lists"
                onClick={showAddToListDialog}
              >
                {isInList ? <BookmarkIcon /> : <BookmarkBorderIcon />}
              </IconButton>
            )}
          </div>
        }
      />
    </>
  )
}

export default LearningResourceCard
export type { LearningResourceCardProps }
