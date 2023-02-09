import { OnRpcRequestHandler } from '@metamask/snap-types';
import { deriveAddressFromEntropy, makeRequest } from './utils';
import { getAccount } from './account';
import {
  getProtocolParameter,
  retrieveUTxO,
  draftTransaction,
  prepareOutput,
  signTransaction,
  submitTx,
} from './transaction';
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
  // const state = await wallet.request({
  //   method: 'snap_manageState',
  //   params: ['get'],
  // });
  // if (!state) {
  //   await wallet.request({
  //     method: 'snap_manageState',
  //     params: ['update', EmptyMetamaskState()],
  //   });
  // }

  switch (request.method) {
    case 'query_balance': {
      try {
        const { baseAddress }: any = await getAccount();

        const accountData = await makeRequest({
          endpoint: `/addresses/${baseAddress}`,
        });
        const amountText = accountData?.amount
          ? `${accountData?.amount[0]?.quantity} ${accountData?.amount[0]?.unit}`
          : 0;
        console.log(`===accountData:`, accountData);
        return wallet.request({
          method: 'snap_confirm',
          params: [
            {
              prompt: origin,
              description: 'Cardano account',
              textAreaContent: `Address: ${baseAddress} \nBalance: ${amountText}`,
            },
          ],
        });
      } catch (error) {
        return wallet.request({
          method: 'snap_confirm',
          params: [
            {
              prompt: origin,
              description: 'Error',
              textAreaContent: new Error(error).message,
            },
          ],
        });
      }
    }

    case 'transfer_token': {
      try {
        const { baseAddress: sendAddr, signKey }: any = await getAccount();
        const receiveAddr = request.params['receiveAddr'];
        const amount = request.params['amount'];
        const parameters = await getProtocolParameter();
        const utxo = await retrieveUTxO(sendAddr);
        const draftTrx = draftTransaction(parameters);
        draftTrx.set_ttl(parameters.slot + 7200);
        const { txBody, txHash } = prepareOutput(
          sendAddr,
          receiveAddr,
          draftTrx,
          utxo,
          amount,
        );

        const transaction = signTransaction(txBody, signKey);
        const result = await wallet.request({
          method: 'snap_confirm',
          params: [
            {
              prompt: `Do you want to transfer?`,
              description: 'Transfer token',
              textAreaContent: `*Detail:\nAmount: ${amount} lovelace \nReceive address: ${receiveAddr}`,
            },
          ],
        });
        if (result) {
          await submitTx(transaction.to_bytes());
          const message = `Transaction successfully submitted: ${txHash}`;
          console.log(message);
          return wallet.request({
            method: 'snap_confirm',
            params: [
              {
                prompt: `Transfer status`,
                description: 'Transaction successfully submitted',
                textAreaContent: `TX hash: ${txHash}`,
              },
            ],
          });
        }
        return result;
      } catch (error) {
        console.log(`Transfer error:`, new Error(error).message);
        return wallet.request({
          method: 'snap_confirm',
          params: [
            {
              prompt: `Transfer status`,
              description: 'Failed to submit transaction',
              textAreaContent: new Error(error).message,
            },
          ],
        });
      }
    }
    default:
      throw new Error('Method not found.');
  }
};
