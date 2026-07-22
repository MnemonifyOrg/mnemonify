export const DEFAULT_NAV_MODE = 'linear';

export function resolveNavMode(meta) {
  return meta?.nav_mode || DEFAULT_NAV_MODE;
}
