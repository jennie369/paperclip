'use client';

import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  className?: string;
}

const alignMap: Record<NonNullable<Column<unknown>['align']>, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

function SortIcon({ columnKey, sortBy, sortOrder }: {
  columnKey: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  if (sortBy !== columnKey) {
    return <ArrowUpDown className="w-3 h-3 ml-1 inline-block opacity-50" />;
  }
  if (sortOrder === 'asc') {
    return <ArrowUp className="w-3 h-3 ml-1 inline-block text-gold" />;
  }
  return <ArrowDown className="w-3 h-3 ml-1 inline-block text-gold" />;
}

function SkeletonRow({ colCount }: { colCount: number }) {
  return (
    <tr>
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded-sm bg-bg-4 animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'Không có dữ liệu',
  onRowClick,
  sortBy,
  sortOrder,
  onSort,
  className,
}: DataTableProps<T>): React.JSX.Element {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="dt">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  alignMap[col.align || 'left'],
                  col.sortable && 'cursor-pointer select-none hover:text-txt',
                )}
                style={col.width ? { width: col.width } : undefined}
                onClick={
                  col.sortable && onSort
                    ? () => onSort(col.key)
                    : undefined
                }
              >
                <span className="inline-flex items-center">
                  {col.header}
                  {col.sortable && (
                    <SortIcon
                      columnKey={col.key}
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                    />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} colCount={columns.length} />
            ))
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center py-12 text-txt-3 text-sm"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={cn(
                  'transition-colors duration-fast',
                  onRowClick && 'cursor-pointer',
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(alignMap[col.align || 'left'])}
                  >
                    {col.render
                      ? col.render(row)
                      : (row[col.key] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
