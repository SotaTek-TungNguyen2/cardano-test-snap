import { Buffer } from 'buffer';
import { OnRpcRequestHandler } from '@metamask/snap-types';
import {
  getBIP44AddressKeyDeriver,
  JsonBIP44CoinTypeNode,
} from '@metamask/key-tree';
import {
  Bip32PrivateKey,
  BaseAddress,
  NetworkInfo,
  StakeCredential,
} from '@emurgo/cardano-serialization-lib-asmjs';
import { BlockFrostAPI } from '@blockfrost/blockfrost-js';

const harden = (num: number) => {
  return 0x80000000 + num;
};

const blockFrostAPI = new BlockFrostAPI({
  projectId: 'preprodErVbfRtJxubIxbF5ERCRqeOfAZodPqFK',
});

/**
 * Get a message from the origin. For demonstration purposes only.
 *
 * @param originString - The origin string.
 * @returns A message based on the origin.
 */
export const getMessage = (originString: string): string =>
  `Hello, ${originString}!`;

/**
 * Handle incoming JSON-RPC requests, sent through `wallet_invokeSnap`.
 *
 * @param args - The request handler args as object.
 * @param args.origin - The origin of the request, e.g., the website that
 * invoked the snap.
 * @param args.request - A validated JSON-RPC request object.
 * @returns `null` if the request succeeded.
 * @throws If the request method is not valid for this snap.
 * @throws If the `snap_confirm` call failed.
 */
export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}) => {
  switch (request.method) {
    case 'hello': {
      const derivationPath = "m/1852'/1815'/0'/0/0";
      const [, , coinType, account, change, addressIndex] =
        derivationPath.split('/');
      const bip44Code = Number(coinType.replace("'", ''));
      const bip44Node = (await wallet.request({
        method: 'snap_getBip44Entropy',
        params: {
          coinType: bip44Code,
        },
      })) as JsonBIP44CoinTypeNode;
      console.log(`-bip44Node:`, bip44Node);

      const bip32Node = await wallet.request({
        method: 'snap_getBip32Entropy',
        params: {
          // Must be specified exactly in the manifest
          path: ['m', "1852'", "1815'"],
          curve: 'secp256k1',
        },
      });

      console.log(`-bip32Node:`, bip32Node);
      const rootKey = Bip32PrivateKey.from_bip39_entropy(
        Buffer.from(bip32Node.privateKey.slice(2), 'hex'),
        Buffer.from(''),
      );
      console.log(`xpr:`, rootKey.to_bech32());

      const accountKeyPrv = rootKey
        .derive(harden(1852))
        .derive(harden(1815))
        .derive(harden(0));
      console.log('accountKeyPrv: ', accountKeyPrv.to_bech32());

      const accountKeyPub = accountKeyPrv.to_public();
      console.log('accountKeyPub: ', accountKeyPub.to_bech32());

      const utxoPubKey = accountKeyPrv.derive(0).derive(0).to_public();
      console.log('utxoPubKey: ', utxoPubKey.to_bech32());

      const stakeKey = accountKeyPrv.derive(2).derive(0).to_public();
      console.log('stakeKey: ', stakeKey.to_bech32());

      const baseAddress = BaseAddress.new(
        NetworkInfo.testnet_preprod().network_id(),
        StakeCredential.from_keyhash(utxoPubKey.to_raw_key().hash()),
        StakeCredential.from_keyhash(stakeKey.to_raw_key().hash()),
      );
      console.log('base address: ', baseAddress);
      const accountData = { amount: [{ quantity: 1 }] };
      // await blockFrostAPI.addresses(
      //   baseAddress.to_address().to_bech32(),
      // );
      return wallet.request({
        method: 'snap_confirm',
        params: [
          {
            prompt: getMessage(origin),
            description: 'Cardano account',
            textAreaContent: `${baseAddress
              .to_address()
              .to_bech32()} \nBalance: ${accountData.amount[0].quantity}`,
          },
        ],
      });
    }
    default:
      throw new Error('Method not found.');
  }
};
