import algosdk from 'algosdk';

import {Address, asAddress, asOrganizationId, OrganizationId} from "@/domain";

import type {OnChainOrganization} from "./wire";
import {algodClient, APP_ID} from './config';

import {
    type TransactionSigner,
    orgBoxKey,
    orgNameIndexKey,
    censusBoxKey,
    singleBoxExists,
    readGlobalUint64,
    decodeContractError,
    bytesEqual,
    CENSUS_BOX_MBR,
    CENSUS_BATCH,
    enc,
    addToCensusMethod,
    removeFromCensusMethod,
    createOrganizationMethod,
} from './_contract';

export async function createOrganization(
    signer: TransactionSigner,
    sender: Address,
    name: string,
    description: string,
): Promise<{ orgId: OrganizationId; txId: string }> {
    const currentOrgId = asOrganizationId(await readGlobalUint64('org_id'));
    const nextId = asOrganizationId(currentOrgId + 1);

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
        const orgId = asOrganizationId(Number(methodResult.returnValue));

        return {orgId, txId: methodResult.txID};
    } catch (err) {
        throw decodeContractError(err);
    }
}

export async function getOrganization(orgId: OrganizationId): Promise<OnChainOrganization | null> {
    try {
        const box = await algodClient.getApplicationBoxByName(APP_ID, orgBoxKey(orgId)).do();
        return decodeOrganization(box.value);
    } catch {
        return null;
    }
}

export async function getAllOrganizationIds(): Promise<OrganizationId[]> {
    try {
        const {boxes} = await algodClient.getApplicationBoxes(APP_ID).do();
        const orgPrefix = enc.encode('org_'); // 4 bytes
        const ids: OrganizationId[] = [];

        for (const box of boxes) {
            const name = box.name;
            // org_ box names: "org_" (4) + uint64 (8) = 12 bytes
            if (name.length === 12 && bytesEqual(name.slice(0, 4), orgPrefix)) {
                const id = asOrganizationId(Number(algosdk.bytesToBigInt(name.slice(4))));
                if (id > 0) ids.push(id);
            }
        }

        return ids.sort((a, b) => a - b);
    } catch {
        return [];
    }
}

export async function addToCensus(
    signer: TransactionSigner,
    sender: Address,
    orgId: OrganizationId,
    members: Address[],
    onProgress?: (done: number, total: number) => void,
): Promise<void> {
    if (members.length === 0) return;

    const appAddress = algosdk.getApplicationAddress(APP_ID);

    const batches: Address[][] = [];

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

export async function removeFromCensus(
    signer: TransactionSigner,
    sender: Address,
    orgId: OrganizationId,
    members: Address[],
): Promise<void> {
    if (members.length === 0) return;

    const suggestedParams = await algodClient.getTransactionParams().do();
    const composer = new algosdk.AtomicTransactionComposer();

    for (let i = 0; i < members.length; i += CENSUS_BATCH) {
        const batch = members.slice(i, i + CENSUS_BATCH);

        composer.addMethodCall({
            appID: APP_ID,
            method: removeFromCensusMethod,
            methodArgs: [BigInt(orgId), batch],
            sender,
            signer,
            suggestedParams,
            boxes: [
                {appIndex: APP_ID, name: orgBoxKey(orgId)},
                ...batch.map((m) => ({appIndex: APP_ID, name: censusBoxKey(orgId, m)})),
            ],
        });
    }

    try {
        await composer.execute(algodClient, 4);
    } catch (err) {
        throw decodeContractError(err);
    }
}

export async function getCensusMembers(orgId: OrganizationId): Promise<Address[]> {
    try {
        const {boxes} = await algodClient.getApplicationBoxes(APP_ID).do();
        const prefix = enc.encode('cs_'); // 3 bytes
        const orgIdBytes = algosdk.bigIntToBytes(orgId, 8);
        const members: Address[] = [];

        for (const box of boxes) {
            const name = box.name;
            // census box names: "cs_" (3) + org_id (8) + member pubkey (32) = 43 bytes
            if (
                name.length === 43 &&
                bytesEqual(name.slice(0, 3), prefix) &&
                bytesEqual(name.slice(3, 11), orgIdBytes)
            ) {
                members.push(asAddress(algosdk.encodeAddress(name.slice(11))));
            }
        }

        return members;
    } catch {
        return [];
    }
}

export async function getCensusMemberCount(orgId: OrganizationId): Promise<number> {
    try {
        const {boxes} = await algodClient.getApplicationBoxes(APP_ID).do();
        const prefix = enc.encode('cs_');
        const orgIdBytes = algosdk.bigIntToBytes(orgId, 8);

        return boxes.filter(
            (box) =>
                box.name.length === 43 &&
                bytesEqual(box.name.slice(0, 3), prefix) &&
                bytesEqual(box.name.slice(3, 11), orgIdBytes),
        ).length;
    } catch {
        return 0;
    }
}

export async function isInCensusChain(address: Address, orgId: OrganizationId): Promise<boolean> {
    return singleBoxExists(censusBoxKey(orgId, address));
}

function decodeOrganization(data: Uint8Array): OnChainOrganization {
    const type = algosdk.ABIType.from('(uint64,string,string,address)');
    const decoded = type.decode(data) as [bigint, string, string, string];

    return {
        orgId: asOrganizationId(Number(decoded[0])),
        name: decoded[1],
        description: decoded[2],
        organizer: asAddress(decoded[3]),
        memberCount: 0,
    };
}