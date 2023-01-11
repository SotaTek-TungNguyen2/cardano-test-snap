import { OnRpcRequestHandler } from '@metamask/snap-types';
import { deriveAddressFromEntropy } from './helper';

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
    case 'query_balance': {
      const bip32Node: any = await wallet.request({
        method: 'snap_getBip32Entropy',
        params: {
          // Must be specified exactly in the manifest
          path: ['m', "1852'", "1815'"],
          curve: 'ed25519',
        },
      });

      // console.log(
      //   `-bip32Node:`,
      //   bip32Node,
      //   bip32Node.privateKey,
      //   bip32Node.publicKey,
      // );

      // const cardanoPublicKey = await wallet.request({
      //   method: 'snap_getBip32PublicKey',
      //   params: {
      //     // The path and curve must be specified in the initial permissions.
      //     path: ['m', "1852'", "1815'"],
      //     curve: 'ed25519',
      //     compressed: false,
      //   },
      // });

      // console.log(cardanoPublicKey);

      const baseAddress: any = deriveAddressFromEntropy(
        bip32Node.privateKey.slice(2),
      );
      // try {
      //   const baseAddress1 = deriveAddress(
      //     bip32Node.publicKey.slice(2),
      //     0,
      //     0,
      //     true,
      //   );
      //   if (baseAddress1) {
      //     baseAddress = baseAddress1;
      //   }
      //   console.log('base address1: ', baseAddress1);
      // } catch (error) {
      //   console.log(`==92 Error:`, error);
      // }

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
            prompt: origin,
            description: 'Cardano account',
            textAreaContent: `Address: ${baseAddress
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
