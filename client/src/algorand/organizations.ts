import algosdk from 'algosdk';

import {algodClient, APP_ID} from './config';

import {
    enc,
    orgBoxKey,
    orgNameIndexKey,
    censusBoxKey,
    createOrganizationMethod,
    addToCensusMethod,
    readGlobalUint64,
    decodeContractError,
    CENSUS_BOX_MBR,
    CENSUS_BATCH,
    type TransactionSigner,
} from './_contract';

export async function createOrganization(
    signer: TransactionSigner,
    sender: string,
    name: string,
    description: string,
): Promise<{ orgId: number; txId: string }> {
    const currentOrgId = await readGlobalUint64('org_id');
    const nextId = currentOrgId + 1;

    const suggestedParams = await algodClient.getTransactionParams().do();
    const appAddress = algosdk.getApplicationAddress(APP_ID);

    // Paga el compte de l'aplicació per cobrir MBR per a les 3 boxes que crearà:
    // box org (key=12, value=8+2+nom+2+desc+32), box d'índex de nom, box de cens organitzador
    const nameBytes = enc.encode(name);
    const descBytes = enc.encode(description);
    const orgValueSize = 8 + 2 + nameBytes.length + 2 + descBytes.length + 32;
    const orgBoxMbr = 2500 + 400 * (12 + orgValueSize);
    const nameIndexMbr = 2500 + 400 * (3 + 2 + nameBytes.length + 8);
    const totalMbr = orgBoxMbr + nameIndexMbr + CENSUS_BOX_MBR;

    const payTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender,
        receiver: appAddress,
        amount: totalMbr,
        suggestedParams,
    });

    const composer = new algosdk.AtomicTransactionComposer();

    composer.addTransaction({txn: payTxn, signer});
    composer.addMethodCall({
        appID: APP_ID,
        method: createOrganizationMethod,
        methodArgs: [name, description],
        sender,
        signer,
        suggestedParams,
        boxes: [
            {appIndex: APP_ID, name: orgNameIndexKey(name)},
            {appIndex: APP_ID, name: orgBoxKey(nextId)},
            {appIndex: APP_ID, name: censusBoxKey(nextId, sender)},
        ],
    });

    try {
        const result = await composer.execute(algodClient, 4);
        const methodResult = result.methodResults[0];
        const orgId = Number(methodResult.returnValue as bigint);
        return {orgId, txId: methodResult.txID};
    } catch (err) {
        throw decodeContractError(err);
    }
}

export async function addToCensus(
    signer: TransactionSigner,
    sender: string,
    orgId: number,
    members: string[],
    onProgress?: (done: number, total: number) => void,
): Promise<void> {
    if (members.length === 0) return;

    const appAddress = algosdk.getApplicationAddress(APP_ID);

    const batches: string[][] = [];

    for (let i = 0; i < members.length; i += CENSUS_BATCH) {
        batches.push(members.slice(i, i + CENSUS_BATCH));
    }

    let done = 0;

    try {
        await Promise.all(
            batches.map(async (batch) => {
                const suggestedParams = await algodClient.getTransactionParams().do();

                const payTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
                    sender,
                    receiver: appAddress,
                    amount: CENSUS_BOX_MBR * batch.length,
                    suggestedParams,
                });

                const composer = new algosdk.AtomicTransactionComposer();
                composer.addTransaction({txn: payTxn, signer});
                composer.addMethodCall({
                    appID: APP_ID,
                    method: addToCensusMethod,
                    methodArgs: [BigInt(orgId), batch],
                    sender,
                    signer,
                    suggestedParams,
                    boxes: [
                        {appIndex: APP_ID, name: orgBoxKey(orgId)},
                        ...batch.map(m => ({appIndex: APP_ID, name: censusBoxKey(orgId, m)})),
                    ],
                });

                await composer.execute(algodClient, 4);
                done += batch.length;
                onProgress?.(done, members.length);
            }),
        );
    } catch (err) {
        throw decodeContractError(err);
    }
}
