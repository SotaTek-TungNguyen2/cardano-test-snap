import { OnRpcRequestHandler } from '@metamask/snap-types';
import {
  getBIP44AddressKeyDeriver,
  JsonBIP44CoinTypeNode,
} from '@metamask/key-tree';
import converter from 'bech32-converting';
import blake from 'blakejs';
import {
  Bip32PrivateKey,
  BaseAddress,
  NetworkInfo,
  StakeCredential,
} from '@emurgo/cardano-serialization-lib-asmjs';
import { BlockFrostAPI } from '@blockfrost/blockfrost-js';

/**
 * Get a message from the origin. For demonstration purposes only.
 *
 * @param originString - The origin string.
 * @returns A message based on the origin.
 */
export const getMessage = (originString: string): string =>
  `Hello, ${originString}!`;

const harden = (num: number) => {
  return 0x80000000 + num;
};

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
      // const derivationPath = "m/1852'/1815'/0'/0/0";
      // const [, , coinType, account, change, addressIndex] =
      //   derivationPath.split('/');
      // const bip44Code = Number(coinType.replace("'", ''));
      try {
        // const bip44Node = (await wallet.request({
        //   method: 'snap_getBip44Entropy',
        //   params: {
        //     coinType: bip44Code,
        //   },
        // })) as JsonBIP44CoinTypeNode;
        console.log(`--node version:`, process?.version?.node)
        const blockFrostAPI = new BlockFrostAPI({
          projectId: 'preprodErVbfRtJxubIxbF5ERCRqeOfAZodPqFK',
        });

        const bip32Node = await wallet.request({
          method: 'snap_getBip32Entropy',
          params: {
            // Must be specified exactly in the manifest
            path: ['m', "1852'", "1815'"],
            curve: 'secp256k1',
          },
        });

        console.log(`-bip32Node:`, bip32Node);

        // const addressKeyDeriver = await getBIP44AddressKeyDeriver(bip44Node, {
        //   account: Number(account.replace("'", '')),
        //   change: Number(change),
        // });
        const addressPrefix = 'addr';

        // const addressKey = await addressKeyDeriver(Number(addressIndex));
        // `echo "${addressKey}" | xxd -r -p - | b2sum --length 224 --binary | cut -c 1-56`
        const cardanoAddr = converter(addressPrefix).toBech32(
          '6186e9653a7a16716fdc286953e2e8132aeff0cabd5dd9eeee6115c00b',
        );
        console.log('cardano address:', cardanoAddr);
        // console.log(addressKey, addressKey.extendedKey, addressKey.privateKey);
        const rootKey = Bip32PrivateKey.from_bip39_entropy(
          Buffer.from(bip32Node.privateKey, 'hex'),
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
        // console.log(`===`, converter('addr_').toHex('addr_xpub1hmlef8vm8whnfenur72n8dayhtqg2nglep7ycad78j2t8wzyn5mw0cqlmzpt2qnvm2u7c5uuf5j474qmyhqmytayj5jgjl0cwmt9enq3dl752'))
        // console.log(`---`)
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
        const account = {amount: [{quantity: 1}]}
        // await blockFrostAPI.addresses(
        //   baseAddress.to_address().to_bech32(),
        // );
        return wallet.request({
          method: 'snap_confirm',
          params: [
            {
              prompt: getMessage(origin),
              description: 'Cardano address',
              textAreaContent: `- Balance: ${
                account.amount[0].quantity
              } lovelace
              | ${baseAddress.to_address().to_bech32()}
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
