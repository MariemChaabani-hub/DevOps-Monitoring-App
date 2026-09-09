import type { ComponentType } from 'react';

/**
 * Type declaration for MetricBar.js — see StatusBadge.d.ts for why this
 * project pairs .d.ts files with plain .js modules instead of converting
 * them to .tsx.
 */
declare const MetricBar: ComponentType<{
  label: string;
  value: number;
  type?: 'cpu' | 'ram' | 'disk';
}>;

export default MetricBar;
