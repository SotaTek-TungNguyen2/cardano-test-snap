import { OnRpcRequestHandler } from '@metamask/snap-types';
import {
  getBIP44AddressKeyDeriver,
  JsonBIP44CoinTypeNode,
} from '@metamask/key-tree';
import converter from 'bech32-converting';
import blake from 'blakejs';
import {
  // BaseAddress,
  // NetworkInfo,
  // StakeCredential,
  Bip32PrivateKey,
} from '@emurgo/cardano-serialization-lib-asmjs';

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
      const derivationPath = "m/44'/1815'/0'/0/0";
      const [, , coinType, account, change, addressIndex] =
        derivationPath.split('/');
      const bip44Code = Number(coinType.replace("'", ''));
      try {
        const bip44Node = (await wallet.request({
          method: 'snap_getBip44Entropy',
          params: {
            coinType: bip44Code,
          },
        })) as JsonBIP44CoinTypeNode;

        const addressKeyDeriver = await getBIP44AddressKeyDeriver(bip44Node, {
          account: Number(account.replace("'", '')),
          change: Number(change),
        });
        const addressPrefix = 'addr';

        const addressKey = await addressKeyDeriver(Number(addressIndex));
        // `echo "${addressKey}" | xxd -r -p - | b2sum --length 224 --binary | cut -c 1-56`
        // const cardanoAddr = converter(addressPrefix).toBech32(
        //   '6186e9653a7a16716fdc286953e2e8132aeff0cabd5dd9eeee6115c00b',
        // );

        const rootKey = Bip32PrivateKey.from_bech32(addressKey.extendedKey);
        console.log(`xpr:`, rootKey);
        // const accountKeyPrv = rootKey
        //   .derive(harden(1852))
        //   .derive(harden(1815))
        //   .derive(harden(0));
        // console.log('accountKeyPrv: ', accountKeyPrv.to_bech32());

        // const accountKeyPub = accountKeyPrv.to_public();
        // console.log('accountKeyPub: ', accountKeyPub.to_bech32());
        // // console.log(`===`, converter('addr_').toHex('addr_xpub1hmlef8vm8whnfenur72n8dayhtqg2nglep7ycad78j2t8wzyn5mw0cqlmzpt2qnvm2u7c5uuf5j474qmyhqmytayj5jgjl0cwmt9enq3dl752'))
        // // console.log(`---`)
        // const utxoPubKey = accountKeyPrv.derive(0).derive(0).to_public();
        // console.log('utxoPubKey: ', utxoPubKey.to_bech32());

        // const utxoPubKey = addressKey.
        // const baseAddress = BaseAddress.new(NetworkInfo.mainnet().network_id(), StakeCredential.from_keyhash())
        // const cardanoDecoded = converter(addressPrefix).toHex(cardanoAddr);
        console.log(
          `-addressKeyDeriver:`,
          addressKey.extendedKey,
          // Object.keys(addressKey),
          // blake.blake2bHex(addressKey.address),
        );

        return wallet.request({
          method: 'snap_confirm',
          params: [
            {
              prompt: getMessage(origin),
              description: 'Cardano address',
              textAreaContent: `${addressKey.address}
              | ${cardanoAddr}`,
            },
          ],
        });
      } catch (error) {
        console.log(`===Err:`, error);
      }
      return wallet.request({
        method: 'snap_confirm',
        params: [
          {
            prompt: getMessage(origin),
            description: 'Cardano address',
            textAreaContent: 'addressKey',
          },
        ],
      });
    }
    default:
      throw new Error('Method not found.');
  }
};
