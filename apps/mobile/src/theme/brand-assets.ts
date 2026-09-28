// Keep static requires so Metro bundles the supplied official logo pack.
export const brandAssets = {
  logoFull: require('../../assets/brand/horizontal-logo.png'),
  primaryLogo: require('../../assets/brand/primary-logo.png'),
  textOnlyLogo: require('../../assets/brand/text-only-logo.png'),
  blackStackedLogo: require('../../assets/brand/black-stacked-logo.png'),
  whiteStackedLogo: require('../../assets/brand/white-stacked-logo.png'),
  blackSymbol: require('../../assets/brand/black-symbol.png'),
  whiteSymbol: require('../../assets/brand/white-symbol.png'),
  appIcon: require('../../assets/brand/app-icon.png'),
  appIconLight: require('../../assets/brand/app-icon-light.png'),
  appIconDark: require('../../assets/brand/app-icon-dark.png'),
  appIconRound: require('../../assets/brand/app-icon-round.png'),
} as const;
