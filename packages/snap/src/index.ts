import { OnRpcRequestHandler } from '@metamask/snap-types';
import {
  // getBIP44AddressKeyDeriver,
  JsonBIP44CoinTypeNode,
  SLIP10Node
} from '@metamask/key-tree';
import { deriveAddress, deriveAddressFromEntropy } from './helper';

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

      // const deriveBip44Address = await getBIP44AddressKeyDeriver(bip44Node);
      // console.log(`-deriveBip44Address:`, deriveBip44Address);

      // path: ['m', '1852', '1815'],
      const bip32Node: any = await wallet.request({
        method: 'snap_getBip32Entropy',
        params: {
          // Must be specified exactly in the manifest
          path: ['m', "1852'", "1815'"],
          curve: 'ed25519',
        },
      });

      console.log(
        `-bip32Node:`,
        bip32Node,
        bip32Node.privateKey,
        bip32Node.publicKey,
      );

      const cardanoPublicKey = await wallet.request({
        method: 'snap_getBip32PublicKey',
        params: {
          // The path and curve must be specified in the initial permissions.
          path: ['m', "1852'", "1815'"],
          curve: 'ed25519',
          compressed: false,
        },
      });

      console.log(cardanoPublicKey);
      // const cardanoSlip10Node = await SLIP10Node.fromJson(bip32Node);
      // console.log(`-cardanoSlip10Node:`, cardanoSlip10Node);
      // const accountKey0 = await cardanoSlip10Node.derive(["bip32:0'"]);
      // console.log(`-cardanoSlip10Node:`, accountKey0);

      let baseAddress: any = deriveAddressFromEntropy(bip32Node.privateKey.slice(2));
      try {
        const baseAddress1 = deriveAddress(
          bip32Node.publicKey.slice(2),
          0,
          0,
          true,
        );
        if (baseAddress1) {
          baseAddress = baseAddress1;
        }
        console.log('base address1: ', baseAddress1);
      } catch (error) {
        console.log(`==92 Error:`, error);
      }

      console.log('base address: ', baseAddress.to_address().to_bech32());
      const fetchRequest = await fetch(
        `https://cardano-preprod.blockfrost.io/api/v0/addresses/${baseAddress
          .to_address()
          .to_bech32()}`,
        {
          method: 'GET',
          headers: {
            project_id: 'preprodErVbfRtJxubIxbF5ERCRqeOfAZodPqFK',
          },
        },
      );
      const accountData = await fetchRequest.json();
      console.log(`===accountData:`, accountData);
      return wallet.request({
        method: 'snap_confirm',
        params: [
          {
            prompt: getMessage(origin),
            description: 'Cardano account',
            textAreaContent: `${baseAddress
              .to_address()
              .to_bech32()} \nBalance: ${accountData?.amount[0]?.quantity}`,
          },
        ],
      });
    }
    default:
      throw new Error('Method not found.');
  }
};
