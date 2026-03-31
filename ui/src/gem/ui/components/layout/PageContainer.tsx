'use client';

import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: boolean;
  noPadding?: boolean;
}

export function PageContainer({
  children,
  className = '',
  maxWidth = true,
  noPadding = false,
}: PageContainerProps): React.JSX.Element {
  return (
    <main
      className={`flex-1 overflow-y-auto ${
        noPadding ? '' : 'px-6 py-5'
      } ${className}`}
      style={{ paddingBottom: '80px' }} // Đủ lớn để nội dung không bị cắt ở bottom
    >
      <div className={maxWidth ? 'max-w-content mx-auto' : ''}>
        {children}
      </div>
    </main>
  );
}
