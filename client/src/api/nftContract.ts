import { TezosToolkit, MichelsonMap } from '@taquito/taquito';
import { BigNumber } from 'bignumber.js';
import { retrieveStorageField, address, nat } from './contractUtil';

interface CreateTokenArgs {
  symbol: string;
  name: string;
  description: string;
  ipfsCid: string;
}

export interface NftContract {
  createToken(args: CreateTokenArgs): Promise<void>
}

const mkNftContract = async (
  tzClient: TezosToolkit,
  contractAddress: address
): Promise<NftContract> => {
  const contract = await tzClient.wallet.at(contractAddress);
  const ownerAddress = await tzClient.wallet.pkh();

  // Wallet API does not seem to accept polling interval
  //
  // const constants = await tzClient.rpc.getConstants();
  // const pollingInterval: number = Number(constants.time_between_blocks[0]) / 5;

  return {    
    async createToken({ 
        symbol,
        name,
        description,
        ipfsCid
      }: CreateTokenArgs
    ): Promise<void> {
      const tokenId = await retrieveStorageField<nat>(
        contract,
        'next_token_id'
      );
      
      const params = [{
        metadata: {
          token_id: tokenId,
          symbol,
          name,
          decimals: new BigNumber(0),
          extras: createExtras(description, ipfsCid)
        },
        owner: ownerAddress
      }];

      const operation = await contract.methods.mint(params).send();
      await operation.confirmation(3);
    }
  };
};

const createExtras = (description: string, ipfsCid: string) => {
  const extras = new MichelsonMap<string, string>({
    prim: 'map',
    args: [{ prim: 'string' }, { prim: 'string' }]
  });

  extras.set('description', description);
  extras.set('ipfs_cid', ipfsCid);

  return extras;
};

export default mkNftContract;