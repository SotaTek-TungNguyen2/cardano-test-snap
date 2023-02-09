import { SLIP10Node } from '@metamask/key-tree';
import { deriveAddressFromEntropy } from './utils';

export const getAccount = async () => {
  const bip32Node: any = await wallet.request({
    method: 'snap_getBip32Entropy',
    params: {
      path: ['m', "1852'", "1815'"],
      curve: 'ed25519',
    },
  });
  const cardanoSlip10Node = await SLIP10Node.fromJSON(bip32Node);
  console.log(`=cardanoSlip10Node`, cardanoSlip10Node);
  const accountKey0 = await cardanoSlip10Node.derive(["bip32:0'"]);
  console.log(`=accountKey0`, accountKey0);

  return deriveAddressFromEntropy(bip32Node.privateKey.slice(2));
};
