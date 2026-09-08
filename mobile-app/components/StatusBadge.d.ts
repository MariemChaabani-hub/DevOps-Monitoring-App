import type { ComponentType } from 'react';

/**
 * Type declaration for StatusBadge.js — see apiService.d.ts for why this
 * project pairs .d.ts files with plain .js modules instead of converting
 * them to .tsx. Without this, TS infers `color`'s type from its `= null`
 * default value alone (i.e. just `null`), rejecting any real color string
 * passed in from a .tsx caller.
 */
declare const StatusBadge: ComponentType<{
  status?: string;
  label?: string | null;
  color?: string | null;
}>;

export default StatusBadge;
