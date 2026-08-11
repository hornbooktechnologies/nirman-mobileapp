export const brandPalette = {
  primary: '#676F4B',
  secondary: '#C16C31',
  dark: '#2A211B',
  light: '#EAF2EC',
  coffee: '#2A211B',
  blueprint: '#435D64',
  orange: '#C16C31',
} as const;

export const surfacePalette = {
  page: '#F7F5EF',
  card: '#F0F4EC',
  elevated: '#FFFFFF',
  muted: '#E9D7C4',
  mist: '#E6F1EA',
  blueprint: '#E8F0F1',
  coffee: '#3A2E27',
} as const;

export const textPalette = {
  primary: '#2A211B',
  secondary: '#5F635A',
  muted: '#9B9F94',
  inverse: '#FFFFFF',
} as const;

export const statusPalette = {
  success: '#194826',
  warning: '#FCBD41',
  danger: '#D9534F',
  info: '#3B708F',
  purple: '#7754A6',
  green: '#3F7C54',
  yellow: '#DFAE2E',
} as const;

export const supportingPalette = {
  sageMist: '#EAF2EC',
  mintCream: '#DDEBE2',
  warmIvory: '#FAF8F5',
  oliveCharcoal: '#3C433B',
  caramelCopper: '#B8793D',
  warmSand: '#E6D6BB',
  sageGreen: '#8FA48F',
  constructionOrange: '#D88032',
  darkCoffee: '#2A211B',
  blueprintMist: '#EAF0F2',
  blueprintInk: '#334B5F',
  clayDanger: '#B94B43',
} as const;

export const nirmanSitePalette = {
  brand: brandPalette,
  surface: surfacePalette,
  text: textPalette,
  status: statusPalette,
  supporting: supportingPalette,
} as const;

export type BrandPalette = typeof brandPalette;
export type SurfacePalette = typeof surfacePalette;
export type TextPalette = typeof textPalette;
export type StatusPalette = typeof statusPalette;
export type SupportingPalette = typeof supportingPalette;
export type NirmanSitePalette = typeof nirmanSitePalette;
