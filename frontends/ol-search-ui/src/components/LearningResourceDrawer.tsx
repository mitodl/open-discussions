import React from "react"
import Drawer from "@mui/material/Drawer"
import { LearningResourceResult } from "../interfaces"
import ExpandedLearningResourceDisplay from "./ExpandedLearningResourceDisplay"
import { useQuery } from "react-query"
import { useSearchParams } from "ol-util"

export type ResourceIdentifiers = {
  type: string
  id: number | string
  runId?: number | string | undefined
}

export const useGetResourceIdentifiersFromUrl = () => {
  const [searchParams] = useSearchParams()
  const resourceId = searchParams.get("resourceId")
  const resourceType = searchParams.get("resourceType")

  if (resourceId && resourceType) {
    return { type: resourceType, id: resourceId }
  } else {
    return null
  }
}

const useGetResource = (params: ResourceIdentifiers) => {
  const url = `${params.type}s/${params.id}`

  return useQuery(url)
}

type LearningResourceDrawerProps = {
  drawerObject: ResourceIdentifiers | null
  setDrawerObject: (params: ResourceIdentifiers | null) => void
}

export const LearningResourceDrawer: React.FC<LearningResourceDrawerProps> = ({
  drawerObject,
  setDrawerObject
}) => {
  const isOpen =
    drawerObject !== null &&
    ["course", "program", "video"].includes(drawerObject.type)

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={() => setDrawerObject(null)}
      className="align-right lr-drawer"
    >
      {isOpen && (
        <DrawerContents
          drawerObject={drawerObject}
          setDrawerObject={setDrawerObject}
        />
      )}
    </Drawer>
  )
}

type DrawerContentsProps = {
  drawerObject: ResourceIdentifiers
  setDrawerObject: (params: ResourceIdentifiers | null) => void
}
const DrawerContents: React.FC<DrawerContentsProps> = ({
  drawerObject,
  setDrawerObject
}) => {
  const resource = useGetResource(drawerObject)

  if (!resource.data) {
    return <div></div>
  }

  return (
    <div className="drawer-nav">
      <button
        tabIndex={0}
        className="drawer-close"
        onClick={() => setDrawerObject(null)}
      >
        <i className="material-icons clear">clear</i>
      </button>
      <ExpandedLearningResourceDisplay
        object={resource.data as LearningResourceResult}
        runId={drawerObject.runId}
        setShowResourceDrawer={setDrawerObject}
      />
      <div className="footer" />
    </div>
  )
}
