import { Buffer } from 'buffer';
import {
  TransactionBuilderConfigBuilder,
  TransactionBuilder,
  LinearFee,
  BigNum,
  TransactionOutput,
  Address,
  Value,
  TransactionInput,
  TransactionHash,
  TransactionWitnessSet,
  Vkeywitnesses,
  Transaction,
  // eslint-disable-next-line camelcase
  hash_transaction,
  // eslint-disable-next-line camelcase
  make_vkey_witness,
} from '@emurgo/cardano-serialization-lib-asmjs';
import { makeRequest } from './utils';

export const getProtocolParameter = async () => {
  const latestBlock = await makeRequest({ endpoint: '/blocks/latest' });
  if (!latestBlock) {
    throw new Error('Failed to get latest block');
  }

  const parameters = await makeRequest({
    endpoint: `/epochs/${latestBlock.epoch}/parameters`,
  });
  if (!parameters) {
    throw new Error('Failed to get parameters');
  }

  return {
    linearFee: {
      minFeeA: parameters.min_fee_a.toString(),
      minFeeB: parameters.min_fee_b.toString(),
    },
    minUtxo: parameters.min_utxo,
    poolDeposit: parameters.pool_deposit,
    keyDeposit: parameters.key_deposit,
    maxValSize: parameters.max_val_size,
    maxTxSize: parameters.max_tx_size,
    coinsPerUtxoWord: parameters.coins_per_utxo_word,
    slot: latestBlock.slot,
  };
};

export const retrieveUTxO = async (address: string) => {
  const utxo = await makeRequest({ endpoint: `/addresses/${address}/utxos` });
  if (!utxo || utxo.length === 0) {
    throw new Error('Failed to retrive UTXO');
  }
  return utxo;
};

export const draftTransaction = (parameters: any) => {
  const txBuilderCfg = TransactionBuilderConfigBuilder.new()
    .fee_algo(
      LinearFee.new(
        BigNum.from_str(parameters.linearFee.minFeeA),
        BigNum.from_str(parameters.linearFee.minFeeB),
      ),
    )
    .pool_deposit(BigNum.from_str(parameters.poolDeposit))
    .key_deposit(BigNum.from_str(parameters.keyDeposit))
    .max_value_size(Number(parameters.maxValSize))
    .max_tx_size(parameters.maxTxSize)
    .coins_per_utxo_word(BigNum.from_str(parameters.coinsPerUtxoWord))
    .build();

  return TransactionBuilder.new(txBuilderCfg);
};

export const prepareOutput = (
  sendAddress: string,
  receiveAddress: string,
  draftTrx: any,
  utxos: any,
  outputAmount = '1000000',
) => {
  draftTrx.add_output(
    TransactionOutput.new(
      Address.from_bech32(receiveAddress),
      Value.new(BigNum.from_str(outputAmount)),
    ),
  );

  const sortedUtxos = utxos
    .filter((_) => !_.amount.find((__) => __.unit !== 'lovelace'))
    .sort((a, b) => {
      const amountA = BigNum.from_str(
        a.amount.find((_) => _.unit === 'lovelace')?.quantity || '0',
      );
      const amountB = BigNum.from_str(
        b.amount.find((_) => _.unit === 'lovelace')?.quantity || '0',
      );
      return amountB.compare(amountA);
    });
  let totalUtxoAda = BigNum.from_str('0');

  for (const utxo of sortedUtxos) {
    const amount = utxo.amount.find((_) => _.unit === 'lovelace')?.quantity;
    if (!amount) {
      continue;
    }

    const input = TransactionInput.new(
      TransactionHash.from_bytes(Buffer.from(utxo.tx_hash, 'hex')),
      utxo.output_index,
    );
    const inputValue = Value.new(BigNum.from_str(amount.toString()));
    draftTrx.add_input(Address.from_bech32(sendAddress), input, inputValue);

    const fee = draftTrx.min_fee();
    totalUtxoAda = totalUtxoAda.checked_add(BigNum.from_str(amount.toString()));
    if (
      totalUtxoAda.compare(BigNum.from_str(outputAmount).checked_add(fee)) >= 0
    ) {
      // break the loop since we have enough ADA to cover the output + fee
      break;
    }
  }

  draftTrx.add_change_if_needed(Address.from_bech32(sendAddress));

  const txBody = draftTrx.build();
  const txHash = Buffer.from(hash_transaction(txBody).to_bytes()).toString(
    'hex',
  );

  return { txBody, txHash };
};

export const signTransaction = (txBody: any, signKey: any) => {
  const txHash = hash_transaction(txBody);
  const witnesses = TransactionWitnessSet.new();
  const vkeyWitnesses = Vkeywitnesses.new();
  vkeyWitnesses.add(make_vkey_witness(txHash, signKey));

  witnesses.set_vkeys(vkeyWitnesses);

  return Transaction.new(txBody, witnesses);
};

export const submitTx = async (transaction: any) => {
  return await makeRequest({
    body:
      typeof transaction === 'string'
        ? Buffer.from(transaction, 'hex')
        : Buffer.from(transaction),
    endpoint: '/tx/submit',
    method: 'POST',
    headers: { 'Content-type': 'application/cbor' },
  });
};
