import { ReactNode } from "react";

export function generateSlug(text: string): string;

export interface SlugUrlHandleProps {
  slug: string;
  contentType?: string;
  baseUrl?: string | null;
}
export function SlugUrlHandle(props: SlugUrlHandleProps): JSX.Element | null;

export interface MetaSelectProps {
  value: string;
  options?: string[];
  onCommit: (val: string) => void | Promise<void>;
  allowCustom?: boolean;
  storageKey?: string;
  placeholder?: string;
  className?: string;
}
export function MetaSelect(props: MetaSelectProps): JSX.Element;

declare const _default: {
  SlugUrlHandle: typeof SlugUrlHandle;
  MetaSelect: typeof MetaSelect;
  generateSlug: typeof generateSlug;
};
export default _default;
