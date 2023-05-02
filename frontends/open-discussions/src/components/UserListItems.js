// @flow
import React, { useState } from "react"
import { useMutation, useRequest } from "redux-query-react"
import { useSelector } from "react-redux"
import InfiniteScroll from "react-infinite-scroller"

import { Cell, Grid } from "../components/Grid"
import { Loading } from "../components/Loading"
import { SortableItem, SortableContainer } from "../components/SortableList"
import {
  LearningResourceCard,
  LearningResourceRow
} from "../components/LearningResourceCard"
import LRDrawerPaginationControls from "./LRDrawerPaginationControls"

import { SEARCH_LIST_UI } from "../lib/search"
import {
  userListItemsRequest,
  updateUserListItemPositionMutation,
  useUserListItemsSelector,
  useUserListItemsPageSelector
} from "../lib/queries/user_list_items"

import type { ResourceItem } from "../lib/queries/user_list_items"
import type { UserList } from "../flow/discussionTypes"

type ResourceListItemsProps = {
  userListId: number,
  items: Array<ResourceItem>,
  className: string,
  isSorting: ?boolean
}

type ItemsProps = {
  userListId: number,
  className: string,
  items: Array<ResourceItem>
}

type UserListItemSortableCardsProps = {
  userListId: number,
  className: string,
  isSorting: ?boolean,
  pageSize: number
}

type PaginatedResourceListItemsProps = {
  userList: UserList,
  pageSize: number
}

const SortItems = ({ userListId, items, className }: ItemsProps) => {
  const [{ isPending }, updateUserListItemPosition] = useMutation(
    updateUserListItemPositionMutation
  )

  return (
    <SortableContainer
      shouldCancelStart={() => isPending}
      onSortEnd={async ({ oldIndex, newIndex }) => {
        const item = items[oldIndex]
        await updateUserListItemPosition(
          userListId,
          item.item.item_id,
          oldIndex,
          newIndex
        )
      }}
    >
      <Grid className={isPending ? `${className} saving` : className}>
        {items.map((item, i) => (
          <SortableItem key={`item-${item.item.item_id}`} index={i}>
            <Cell width={12} tabIndex="0">
              <LearningResourceCard
                object={item.resource}
                searchResultLayout={SEARCH_LIST_UI}
                reordering
              />
            </Cell>
          </SortableItem>
        ))}
      </Grid>
    </SortableContainer>
  )
}

const ViewItems = ({ items, className }: ItemsProps) => {
  return (
    <Grid className={className}>
      {items.map(item => (
        <Cell width={12} key={`item-${item.item.item_id}`}>
          <LearningResourceCard
            object={item.resource}
            searchResultLayout={SEARCH_LIST_UI}
          />
        </Cell>
      ))}
    </Grid>
  )
}

const SortAndViewItems = ({ isSorting, ...props }: ResourceListItemsProps) => {
  return isSorting ? <SortItems {...props} /> : <ViewItems {...props} />
}

const loader = <Loading className="infinite" key="loader" />

export function UserListItemSortableCards({
  userListId,
  className,
  isSorting,
  pageSize
}: UserListItemSortableCardsProps) {
  const [page, setPage] = useState(0)

  const [{ isFinished }] = useRequest(
    userListItemsRequest(userListId, pageSize * page, pageSize)
  )
  const initialLoadDone = page !== 0 || isFinished

  const userListItemsSelector = useUserListItemsSelector(userListId)

  const { items, count } = useSelector(userListItemsSelector)

  return initialLoadDone ? (
    <InfiniteScroll
      hasMore={
        isFinished &&
        items.length < count &&
        items.length >= pageSize * (page + 1)
      }
      loadMore={() => setPage(page + 1)}
      initialLoad={page === 0}
      loader={loader}
    >
      <SortAndViewItems
        userListId={userListId}
        items={items}
        className={className}
        isSorting={isSorting}
      />
    </InfiniteScroll>
  ) : (
    loader
  )
}

export function PaginatedUserListItems({
  userList,
  pageSize
}: PaginatedResourceListItemsProps) {
  const userListId = userList.id
  const [page, setPage] = useState(0)
  const begin = page * pageSize
  const end = begin + pageSize

  const [{ isFinished }] = useRequest(
    userListItemsRequest(userListId, begin, pageSize)
  )

  const userListItemsPageSelector = useUserListItemsPageSelector(
    userListId,
    begin,
    end
  )

  const { items, count } = useSelector(userListItemsPageSelector)

  return isFinished ? (
    <div className="user-list-items">
      {items.map((item, i) => (
        <LearningResourceRow
          key={i}
          object={item.resource}
          searchResultLayout={SEARCH_LIST_UI}
        />
      ))}
      <LRDrawerPaginationControls
        page={page}
        begin={begin}
        setPage={setPage}
        count={count}
        end={end}
      />
    </div>
  ) : (
    loader
  )
}
