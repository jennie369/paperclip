/**
 * content-center/components/index.js
 * Central export cho tất cả shared components trong Content Center.
 *
 * Import example:
 *   import { ContentResultPanel } from '../components';
 *   import { MetaSelect, SlugUrlHandle } from '../components';
 *   import { PromptImageCards } from '../components';
 */

// Metadata editing
export { MetaSelect, SlugUrlHandle } from './ContentMetaShared';

// Email result panel (DEPRECATED — use ContentResultPanel instead)
// Kept for backward-compat 1-2 commits. Will be removed sau khi production stable.
export { EmailResultPanel, EmailToolbox, EmailViewToolbar } from './EmailResultPanel';

// Content result panel (PRIMARY — replaces EmailResultPanel)
export { ContentResultPanel } from './ContentResultPanel';
export { ContentToolbox } from './ContentToolbox';
export { ResendSendSection } from './ResendSendSection';

// Social content prompt cards
export { PromptImageCards } from './PromptImageCards';

// Existing
export { default as DripStepHtmlEditor } from './DripStepHtmlEditor';
