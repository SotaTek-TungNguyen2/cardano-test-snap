import { Buffer } from 'buffer';
import * as cardanoSerializationLib from '@emurgo/cardano-serialization-lib-asmjs';

const harden = (num: number) => {
  return 0x80000000 + num;
};

export const deriveAddress = (
  accountPublicKey: string,
  role: number,
  addressIndex: number,
  isTestnet: boolean,
  isByron?: boolean,
) => {
  const accountKey = cardanoSerializationLib.Bip32PublicKey.from_bytes(
    Buffer.from(accountPublicKey, 'hex'),
  );
  const utxoPubKey = accountKey.derive(role).derive(addressIndex);
  const mainStakeKey = accountKey.derive(2).derive(0);
  const testnetNetworkInfo = cardanoSerializationLib.NetworkInfo.testnet();
  const mainnetNetworkInfo = cardanoSerializationLib.NetworkInfo.mainnet();
  const networkId = isTestnet
    ? testnetNetworkInfo.network_id()
    : mainnetNetworkInfo.network_id();
  const utxoPubKeyHash = utxoPubKey.to_raw_key().hash();
  const mainStakeKeyHash = mainStakeKey.to_raw_key().hash();
  const utxoStakeCred =
    cardanoSerializationLib.StakeCredential.from_keyhash(utxoPubKeyHash);
  const mainStakeCred =
    cardanoSerializationLib.StakeCredential.from_keyhash(mainStakeKeyHash);
  const baseAddr = cardanoSerializationLib.BaseAddress.new(
    networkId,
    utxoStakeCred,
    mainStakeCred,
  );
  utxoStakeCred.free();
  mainStakeCred.free();
  mainStakeKeyHash.free();
  utxoPubKeyHash.free();
  baseAddr.free();
  if (role === 2 && !isByron) {
    const addressSpecificStakeKey = accountKey.derive(2).derive(addressIndex);
    const stakeKeyHash = addressSpecificStakeKey.to_raw_key().hash();
    const stakeCred =
      cardanoSerializationLib.StakeCredential.from_keyhash(stakeKeyHash);
    // always return stake address
    const rewardAddr = cardanoSerializationLib.RewardAddress.new(
      networkId,
      stakeCred,
    );
    rewardAddr.free();
    addressSpecificStakeKey.free();
    stakeKeyHash.free();
    stakeCred.free();
    return rewardAddr;
  }

  if (isByron) {
    const protocolMagic = isTestnet
      ? testnetNetworkInfo.protocol_magic()
      : mainnetNetworkInfo.protocol_magic();
    const byronAddress = cardanoSerializationLib.ByronAddress.icarus_from_key(
      utxoPubKey,
      protocolMagic,
    );
    const byronAddrBase58 = byronAddress.to_base58();
    byronAddress.free();
    return {
      address: byronAddrBase58,
      path: [role, addressIndex],
    };
  }
  mainStakeKey.free();
  utxoPubKey.free();
  accountKey.free();
  testnetNetworkInfo.free();
  mainnetNetworkInfo.free();
  return baseAddr;
};

export const deriveAddressFromEntropy = (entropy: string) => {
  const { Bip32PrivateKey, BaseAddress, NetworkInfo, StakeCredential } =
    cardanoSerializationLib;

  const rootKey = Bip32PrivateKey.from_bip39_entropy(
    Buffer.from(entropy, 'hex'),
    Buffer.from(''),
  );

  const accountKeyPrv = rootKey
    .derive(harden(1852))
    .derive(harden(1815))
    .derive(harden(0));

  const accountKeyPub = accountKeyPrv.to_public();

  const utxoPubKey = accountKeyPrv.derive(0).derive(0).to_public();

  const stakeKey = accountKeyPrv.derive(2).derive(0).to_public();

  // console.log(`rootKey:`, rootKey.to_bech32());
  // console.log('stakeKey: ', stakeKey.to_bech32());
  // console.log('accountKeyPrv: ', accountKeyPrv.to_bech32());
  console.log('accountKeyPub: ', accountKeyPub.to_bech32());
  // console.log('utxoPubKey: ', utxoPubKey.to_bech32());

  const baseAddress = BaseAddress.new(
    NetworkInfo.testnet_preprod().network_id(),
    StakeCredential.from_keyhash(utxoPubKey.to_raw_key().hash()),
    StakeCredential.from_keyhash(stakeKey.to_raw_key().hash()),
  );
  return baseAddress;
};
