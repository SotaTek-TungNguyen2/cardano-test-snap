export const mainnetConfig: any = {
  cardano: {
    derivationPath: "m/44'/1815'/0'/0/0",
    network: 'mainnet',
    rpc: {
      token: '',
      url: 'https://public-node-api.klaytnapi.com/v1/cypress',
    },
    unit: {
      decimal: 18,
      image: 'https://cryptologos.cc/logos/cardano-ada-logo.png?v=023',
      symbol: 'ADA',
    },
  },
};

export const testnetConfig: any = {
  cardanoPreview: {
    derivationPath: "m/44'/1'/0'/0/0",
    network: 'preview',
    rpc: {
      token: '',
      url: 'https://public-node-api.klaytnapi.com/v1/baobab',
    },
    unit: {
      decimal: 18,
      image: 'https://cryptologos.cc/logos/cardano-ada-logo.png?v=023',
      symbol: 'ADA',
    },
  },
  cardanoPrepod: {
    derivationPath: "m/44'/1'/0'/0/0",
    network: 'prepod',
    rpc: {
      token: '',
      url: 'https://public-node-api.klaytnapi.com/v1/baobab',
    },
    unit: {
      decimal: 18,
      image: 'https://cryptologos.cc/logos/cardano-ada-logo.png?v=023',
      symbol: 'ADA',
    },
  },
};

export const defaultConfig: any = mainnetConfig;
