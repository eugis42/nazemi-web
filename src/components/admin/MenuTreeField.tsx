'use client'

import React, { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { getTranslation } from '@payloadcms/translations'
import {
  Banner,
  Button,
  Collapsible,
  DraggableSortableItem,
  ErrorPill,
  FieldDescription,
  FieldError,
  FieldLabel,
  NullifyLocaleField,
  RenderCustomComponent,
  RenderFields,
  RowLabel,
  useDocumentInfo,
  useForm,
  useFormFields,
  useFormSubmitted,
  useField,
  useTranslation,
  withCondition,
} from '@payloadcms/ui'
import type { ArrayFieldClientComponent, ClientField } from 'payload'

import {
  applyMenuDrop,
  flattenForDrag,
  getDropIndicatorSlot,
  getMenuProjection,
  MENU_TREE_INDENT_PX,
  type MenuDepth,
} from '@/lib/menu-tree'
import './MenuTreeField.scss'

const baseClass = 'array-field'
const treeClass = 'menu-tree-field'

type MenuRowValue = {
  depth?: number | null
  id?: string | null
  label?: string | null
}

function visibleFields(fields: ClientField[]): ClientField[] {
  return fields.filter((field) => !('name' in field && field.name === 'depth'))
}

function reorderIds(current: string[], target: string[]): { from: number; to: number }[] {
  const moves: { from: number; to: number }[] = []
  const list = current.slice()
  for (let to = 0; to < target.length; to++) {
    const want = target[to]
    const from = list.indexOf(want)
    if (from === -1 || from === to) continue
    moves.push({ from, to })
    const [item] = list.splice(from, 1)
    list.splice(to, 0, item)
  }
  return moves
}

function DropIndicator({ depth }: { depth: MenuDepth }) {
  return (
    <div
      aria-hidden
      className={`${treeClass}__drop-indicator`}
      style={{ marginLeft: depth * MENU_TREE_INDENT_PX }}
    >
      <span className={`${treeClass}__drop-indicator-line`} />
      <span className={`${treeClass}__drop-indicator-badge`}>
        {depth === 1 ? '2. úroveň' : '1. úroveň'}
      </span>
    </div>
  )
}

const MenuTreeFieldComponent: ArrayFieldClientComponent = (props) => {
  const {
    field,
    field: {
      name,
      admin: { className, description, initCollapsed = true, isSortable = true } = {},
      fields,
      label,
      localized,
      maxRows,
      minRows: minRowsProp,
      required,
    },
    forceRender = false,
    path: pathFromProps,
    permissions,
    readOnly,
    schemaPath: schemaPathFromProps,
    validate,
  } = props

  const schemaPath = schemaPathFromProps ?? name
  const minRows = minRowsProp ?? (required ? 1 : 0)
  const { setDocFieldPreferences } = useDocumentInfo()
  const { addFieldRow, dispatchFields, getDataByPath, moveFieldRow, removeFieldRow, setModified } =
    useForm()
  const submitted = useFormSubmitted()
  const { i18n, t } = useTranslation()

  const memoizedValidate = useCallback(
    (value: unknown, options: Parameters<NonNullable<typeof validate>>[1]) => {
      if (typeof validate !== 'function') return true
      return validate(value as never, {
        ...(options as object),
        maxRows,
        minRows,
        required,
      } as never)
    },
    [maxRows, minRows, required, validate],
  )

  const {
    customComponents: { AfterInput, BeforeInput, Description, Error, Label } = {},
    disabled,
    errorPaths = [],
    path,
    rows = [],
    showError,
    valid,
    value,
  } = useField<number>({
    hasRows: true,
    potentiallyStalePath: pathFromProps,
    validate: memoizedValidate as never,
  })

  const componentId = useId()
  const scrollIdPrefix = useMemo(() => `scroll-${componentId}`, [componentId])
  const editFields = useMemo(() => visibleFields(fields), [fields])
  const collapseBootstrapped = useRef(false)
  // Keep fields after first expand — values already in form state; remount only re-fetches relation UI.
  const [mountedRowIds, setMountedRowIds] = useState<Set<string>>(() => new Set())

  const labels = useMemo(() => {
    if ('labels' in field && field.labels) {
      return { plural: field.labels.plural, singular: field.labels.singular }
    }
    return {
      plural: t('general:rows'),
      singular: t('general:row'),
    }
  }, [field, t])

  // Stable string → avoid re-render on every unrelated form field tick.
  const depthSignature = useFormFields(([formFields]) =>
    rows
      .map((_, index) => {
        const raw = formFields[`${path}.${index}.depth`]?.value
        return raw === 1 || raw === '1' ? '1' : '0'
      })
      .join(''),
  )

  const depthByIndex = useMemo(
    () => depthSignature.split('').map((c) => (c === '1' ? 1 : 0) as MenuDepth),
    [depthSignature],
  )

  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeLabel, setActiveLabel] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [offsetLeft, setOffsetLeft] = useState(0)
  const lastProjection = useRef<{ depth: MenuDepth } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const rowIds = useMemo(() => rows.map((row) => row.id), [rows])

  const flatItems = useMemo(
    () =>
      rows.map((row, index) => ({
        id: row.id,
        depth: (depthByIndex[index] ?? 0) as MenuDepth,
      })),
    [depthByIndex, rows],
  )

  const projection =
    activeId && overId
      ? getMenuProjection(
          flattenForDrag(flatItems),
          activeId,
          overId,
          offsetLeft,
          MENU_TREE_INDENT_PX,
        )
      : null

  useEffect(() => {
    if (projection) lastProjection.current = { depth: projection.depth }
  }, [projection])

  const dropSlot =
    activeId && overId && projection
      ? getDropIndicatorSlot(rowIds, activeId, overId, projection.depth)
      : null

  const toggleCollapseAll = useCallback(
    (collapsed: boolean) => {
      const updatedRows = rows.map((row) => ({ ...row, collapsed }))
      const collapsedIDs = collapsed ? updatedRows.map((row) => row.id) : []
      setDocFieldPreferences(path, { collapsed: collapsedIDs })
      dispatchFields({ type: 'SET_ALL_ROWS_COLLAPSED', path, updatedRows })
      if (!collapsed) {
        setMountedRowIds(new Set(updatedRows.map((row) => row.id)))
      }
    },
    [dispatchFields, path, rows, setDocFieldPreferences],
  )

  // Only force-collapse when rows explicitly expanded. Skip form churn if already collapsed/undefined.
  useEffect(() => {
    if (collapseBootstrapped.current || !rows.length || !initCollapsed) return
    collapseBootstrapped.current = true
    if (!rows.some((row) => row.collapsed === false)) return
    const updatedRows = rows.map((row) => ({ ...row, collapsed: true }))
    setDocFieldPreferences(path, { collapsed: updatedRows.map((row) => row.id) })
    dispatchFields({ type: 'SET_ALL_ROWS_COLLAPSED', path, updatedRows })
  }, [dispatchFields, initCollapsed, path, rows, setDocFieldPreferences])

  const addRow = useCallback(
    (rowIndex: number) => {
      addFieldRow({ path, rowIndex, schemaPath })
      setTimeout(() => {
        document
          .getElementById(`${scrollIdPrefix}-row-${rowIndex}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 0)
    },
    [addFieldRow, path, schemaPath, scrollIdPrefix],
  )

  const removeRow = useCallback(
    (rowIndex: number) => {
      removeFieldRow({ path, rowIndex })
    },
    [path, removeFieldRow],
  )

  const setCollapse = useCallback(
    (rowID: string, collapsed: boolean) => {
      if (!collapsed) {
        setMountedRowIds((prev) => {
          if (prev.has(rowID)) return prev
          const next = new Set(prev)
          next.add(rowID)
          return next
        })
      }
      const updatedRows = rows.map((row) => (row.id === rowID ? { ...row, collapsed } : row))
      const collapsedIDs = updatedRows.filter((row) => row.collapsed).map((row) => row.id)
      dispatchFields({ type: 'SET_ROW_COLLAPSED', path, updatedRows })
      setDocFieldPreferences(path, { collapsed: collapsedIDs })
    },
    [dispatchFields, path, rows, setDocFieldPreferences],
  )

  const applyTreeDrop = useCallback(
    (fromId: string, toId: string, depth: MenuDepth) => {
      const data = ((getDataByPath(path) as MenuRowValue[] | null) || []).map((item, index) => ({
        ...item,
        depth: depthByIndex[index] ?? 0,
        id: rows[index]?.id ?? item.id ?? `row-${index}`,
      }))

      const next = applyMenuDrop(data, fromId, toId, depth)
      const targetIds = next.map((item) => String(item.id))
      const moves = reorderIds(rowIds, targetIds)

      for (const move of moves) {
        moveFieldRow({ moveFromIndex: move.from, moveToIndex: move.to, path })
      }

      next.forEach((item, index) => {
        dispatchFields({
          type: 'UPDATE',
          path: `${path}.${index}.depth`,
          value: item.depth ?? 0,
        })
      })

      setModified(true)
    },
    [
      depthByIndex,
      dispatchFields,
      getDataByPath,
      moveFieldRow,
      path,
      rowIds,
      rows,
      setModified,
    ],
  )

  const onDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      const id = String(active.id)
      const index = rowIds.indexOf(id)
      const data = (getDataByPath(path) as MenuRowValue[] | null) || []
      const raw = index >= 0 ? data[index]?.label : null
      setActiveLabel(typeof raw === 'string' && raw.trim() ? raw.trim() : null)
      setActiveId(id)
      setOverId(id)
      setOffsetLeft(0)
    },
    [getDataByPath, path, rowIds],
  )

  const onDragMove = useCallback(({ delta }: DragMoveEvent) => {
    setOffsetLeft(delta.x)
  }, [])

  const onDragOver = useCallback(({ over }: { over: { id: string | number } | null }) => {
    setOverId(over ? String(over.id) : null)
  }, [])

  const onDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      const fromId = String(active.id)
      const toId = over ? String(over.id) : fromId
      const depth = lastProjection.current?.depth ?? 0
      setActiveId(null)
      setActiveLabel(null)
      setOverId(null)
      setOffsetLeft(0)
      lastProjection.current = null
      if (!isSortable || readOnly || disabled) return
      applyTreeDrop(fromId, toId, depth)
    },
    [applyTreeDrop, disabled, isSortable, readOnly],
  )

  const onDragCancel = useCallback(() => {
    setActiveId(null)
    setActiveLabel(null)
    setOverId(null)
    setOffsetLeft(0)
    lastProjection.current = null
  }, [])

  const hasMaxRows = Boolean(maxRows && rows.length >= maxRows)
  const fieldErrorCount = errorPaths.length
  const fieldHasErrors = submitted && errorPaths.length > 0
  const showRequired = Boolean((readOnly || disabled) && rows.length === 0)
  const showMinRows = Boolean(
    (rows.length && rows.length < minRows) || (required && rows.length === 0),
  )
  const activeIndex = activeId ? rowIds.indexOf(activeId) : -1
  const dragging = Boolean(activeId)

  return (
    <div
      className={[
        'field-type',
        baseClass,
        treeClass,
        className,
        dragging ? `${treeClass}--dragging` : '',
        fieldHasErrors ? `${baseClass}--has-error` : `${baseClass}--has-no-error`,
      ]
        .filter(Boolean)
        .join(' ')}
      id={`field-${path.replace(/\./g, '__')}`}
    >
      {showError ? (
        <RenderCustomComponent
          CustomComponent={Error}
          Fallback={<FieldError path={path} showError={showError} />}
        />
      ) : null}

      <header className={`${baseClass}__header`}>
        <div className={`${baseClass}__header-wrap`}>
          <div className={`${baseClass}__header-content`}>
            <h3 className={`${baseClass}__title`}>
              <RenderCustomComponent
                CustomComponent={Label}
                Fallback={
                  <FieldLabel
                    as="span"
                    label={label}
                    localized={localized}
                    path={path}
                    required={required}
                  />
                }
              />
            </h3>
            {fieldHasErrors && fieldErrorCount > 0 ? (
              <ErrorPill count={fieldErrorCount} i18n={i18n} withMessage />
            ) : null}
          </div>
          {rows.length > 0 ? (
            <ul className={`${baseClass}__header-actions`}>
              <li>
                <button
                  className={`${baseClass}__header-action`}
                  onClick={() => toggleCollapseAll(true)}
                  type="button"
                >
                  {t('fields:collapseAll')}
                </button>
              </li>
              <li>
                <button
                  className={`${baseClass}__header-action`}
                  onClick={() => toggleCollapseAll(false)}
                  type="button"
                >
                  {t('fields:showAll')}
                </button>
              </li>
            </ul>
          ) : null}
        </div>
        <RenderCustomComponent
          CustomComponent={Description}
          Fallback={
            description ? <FieldDescription description={description} path={path} /> : null
          }
        />
      </header>

      <NullifyLocaleField
        fieldValue={value}
        localized={Boolean(localized)}
        path={path}
        readOnly={Boolean(readOnly)}
      />
      {BeforeInput}

      {(rows.length > 0 || (!valid && (showRequired || showMinRows))) && (
        <DndContext
          collisionDetection={closestCenter}
          measuring={{ droppable: { strategy: MeasuringStrategy.WhileDragging } }}
          onDragCancel={onDragCancel}
          onDragEnd={onDragEnd}
          onDragMove={onDragMove}
          onDragOver={onDragOver}
          onDragStart={onDragStart}
          sensors={sensors}
        >
          <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
            <div className={`${baseClass}__draggable-rows ${treeClass}__rows`}>
              {rows.map((rowData, i) => {
                const rowID = rowData.id
                const rowPath = `${path}.${i}`
                const rowErrorCount = errorPaths?.filter((errorPath) =>
                  errorPath.startsWith(`${rowPath}.`),
                ).length
                const depth = depthByIndex[i] ?? 0
                const isActive = activeId === rowID
                const showDropBefore =
                  dropSlot != null && dropSlot.beforeIndex === i && !isActive
                const showDropOnActive =
                  dropSlot != null && dropSlot.beforeIndex === i && isActive
                const rowCollapsed =
                  typeof rowData.collapsed === 'boolean' ? rowData.collapsed : Boolean(initCollapsed)
                const shouldMountFields =
                  forceRender || !rowCollapsed || mountedRowIds.has(rowID)

                return (
                  <Fragment key={rowID}>
                    {showDropBefore ? <DropIndicator depth={dropSlot.depth} /> : null}
                    <DraggableSortableItem
                      disabled={readOnly || disabled || !isSortable}
                      id={rowID}
                    >
                      {({
                        attributes,
                        isDragging,
                        listeners,
                        setNodeRef,
                        transform,
                        transition,
                      }) => (
                        <div
                          className={[
                            `${treeClass}__row`,
                            depth === 1 ? `${treeClass}__row--child` : `${treeClass}__row--root`,
                            isDragging ? `${treeClass}__row--dragging` : '',
                            isActive ? `${treeClass}__row--active` : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          ref={setNodeRef}
                          style={{
                            // Freeze sibling shuffle — drop line is the preview.
                            height: isDragging && !showDropOnActive ? 0 : undefined,
                            marginBottom: isDragging && !showDropOnActive ? 0 : undefined,
                            marginLeft: depth * MENU_TREE_INDENT_PX,
                            marginTop: isDragging && !showDropOnActive ? 0 : undefined,
                            overflow: isDragging && !showDropOnActive ? 'hidden' : undefined,
                            transform: dragging ? undefined : transform || undefined,
                            transition: dragging ? undefined : transition,
                            zIndex: isDragging ? 0 : undefined,
                          }}
                        >
                          {showDropOnActive ? <DropIndicator depth={dropSlot.depth} /> : null}
                          <div
                            className={`${treeClass}__row-body`}
                            style={{ opacity: isDragging ? 0 : 1 }}
                          >
                            <Collapsible
                              actions={
                                !readOnly && !disabled ? (
                                  <Fragment>
                                    <Button
                                      buttonStyle="icon-label"
                                      className={`${treeClass}__remove`}
                                      icon="x"
                                      iconStyle="none"
                                      onClick={() => removeRow(i)}
                                      tooltip={t('general:remove')}
                                    />
                                  </Fragment>
                                ) : undefined
                              }
                              className={[
                                `${baseClass}__row`,
                                rowErrorCount && submitted
                                  ? `${baseClass}__row--has-errors`
                                  : `${baseClass}__row--no-errors`,
                              ]
                                .filter(Boolean)
                                .join(' ')}
                              collapsibleStyle={rowErrorCount && submitted ? 'error' : 'default'}
                              dragHandleProps={
                                isSortable
                                  ? {
                                      id: rowID,
                                      attributes,
                                      listeners,
                                    }
                                  : undefined
                              }
                              header={
                                <div
                                  className={`${baseClass}__row-header`}
                                  id={`${scrollIdPrefix}-row-${i}`}
                                >
                                  <span
                                    className={`${treeClass}__level`}
                                    title={depth === 1 ? '2. úroveň' : '1. úroveň'}
                                  >
                                    {depth === 1 ? '↳' : '•'}
                                  </span>
                                  <RowLabel
                                    CustomComponent={rows?.[i]?.customComponents?.RowLabel}
                                    label={`${getTranslation(labels.singular, i18n)} ${String(i + 1).padStart(2, '0')}`}
                                    path={rowPath}
                                    rowNumber={i}
                                  />
                                  {rowErrorCount && submitted ? (
                                    <ErrorPill count={rowErrorCount} i18n={i18n} withMessage />
                                  ) : null}
                                </div>
                              }
                              isCollapsed={rowCollapsed}
                              onToggle={(collapsed) => setCollapse(rowID, collapsed)}
                            >
                              {shouldMountFields ? (
                                <RenderFields
                                  className={`${baseClass}__fields`}
                                  fields={editFields}
                                  forceRender={forceRender}
                                  margins="small"
                                  parentIndexPath=""
                                  parentPath={rowPath}
                                  parentSchemaPath={schemaPath}
                                  permissions={
                                    permissions === true ? true : (permissions?.fields ?? true)
                                  }
                                  readOnly={readOnly || disabled}
                                />
                              ) : null}
                            </Collapsible>
                          </div>
                        </div>
                      )}
                    </DraggableSortableItem>
                  </Fragment>
                )
              })}

              {dropSlot != null && dropSlot.beforeIndex >= rows.length ? (
                <DropIndicator depth={dropSlot.depth} />
              ) : null}

              {!valid && showRequired ? (
                <Banner>
                  {t('validation:fieldHasNo', {
                    label: getTranslation(labels.plural, i18n),
                  })}
                </Banner>
              ) : null}
              {!valid && showMinRows ? (
                <Banner type="error">
                  {t('validation:requiresAtLeast', {
                    count: minRows,
                    label:
                      getTranslation(minRows > 1 ? labels.plural : labels.singular, i18n) ||
                      t(minRows > 1 ? 'general:rows' : 'general:row'),
                  })}
                </Banner>
              ) : null}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={null}>
            {activeId && activeIndex >= 0 ? (
              <div
                className={`${treeClass}__overlay`}
                style={{ marginLeft: (projection?.depth ?? 0) * MENU_TREE_INDENT_PX }}
              >
                <span className={`${treeClass}__level`}>
                  {(projection?.depth ?? depthByIndex[activeIndex]) === 1 ? '↳' : '•'}
                </span>
                <span className={`${treeClass}__overlay-label`}>
                  {activeLabel || `Položka ${String(activeIndex + 1).padStart(2, '0')}`}
                </span>
                {projection ? (
                  <span className={`${treeClass}__overlay-meta`}>
                    {projection.depth === 1 ? '2. úroveň' : '1. úroveň'}
                  </span>
                ) : null}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {!hasMaxRows && !readOnly ? (
        <Button
          buttonStyle="icon-label"
          className={`${baseClass}__add-row`}
          disabled={disabled}
          icon="plus"
          iconPosition="left"
          iconStyle="with-border"
          onClick={() => {
            void addRow(typeof value === 'number' ? value : rows.length)
          }}
        >
          {t('fields:addLabel', {
            label: getTranslation(labels.singular, i18n),
          })}
        </Button>
      ) : null}
      {AfterInput}
    </div>
  )
}

export const MenuTreeField = withCondition(MenuTreeFieldComponent)
