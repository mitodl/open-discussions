import React, { useCallback } from "react"
import { useResource } from "../api/learning-resources"
import RoutedDrawer from "./RoutedDrawer"
import { ExpandedLearningResourceDisplay, LearningResource } from "ol-search-ui"
import { useSearchParams } from "ol-util"

const RESOURCE_ID_PARAM = "resource_id"
const RESOURCE_TYPE_PARAM = "resource_type"
const RESOURCE_PARAMS = [RESOURCE_ID_PARAM, RESOURCE_TYPE_PARAM] as const

export type ResourceIdentifiers = {
  type: string
  id: number
  runId?: number | string | undefined
}

type DrawerContentProps = {
  resourceType: string
  resourceId: number
}
const DrawerContent: React.FC<DrawerContentProps> = ({
  resourceId,
  resourceType
}) => {
  const resourceQuery = useResource(resourceType, resourceId)
  const resource = resourceQuery.data
  return (
    <div className="ic-lr-drawer">
      {resource && <ExpandedLearningResourceDisplay resource={resource} />}
    </div>
  )
}

const LearningResourceDrawer: React.FC = () => {
  return (
    <RoutedDrawer
      anchor="right"
      params={RESOURCE_PARAMS}
      requiredParams={RESOURCE_PARAMS}
    >
      {childProps => (
        <DrawerContent
          resourceId={Number(childProps.params.resource_id)}
          resourceType={childProps.params.resource_type}
        />
      )}
    </RoutedDrawer>
  )
}

type ActivateResource = (
  e: Pick<LearningResource, "id" | "object_type">
) => void
const useActivateResource = (): ActivateResource => {
  const [searchParams, setSearchParams] = useSearchParams()
  return useCallback(
    resource => {
      const params = new URLSearchParams(searchParams)
      params.set(RESOURCE_ID_PARAM, String(resource.id))
      params.set(RESOURCE_TYPE_PARAM, resource.object_type)
      setSearchParams(params)
    },
    [setSearchParams, searchParams]
  )
}

export default LearningResourceDrawer

export { useActivateResource }
