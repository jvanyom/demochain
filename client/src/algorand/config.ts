import algosdk from 'algosdk'

const ALGOD_SERVER = import.meta.env['VITE_ALGOD_SERVER'] ?? 'http://localhost'
const ALGOD_PORT = Number(import.meta.env['VITE_ALGOD_PORT'] ?? 4001)
const ALGOD_TOKEN = import.meta.env['VITE_ALGOD_TOKEN'] ?? 'a'.repeat(64)

// ── App ID del contracte ─────────────────────────────────────────────────
// Configurat via VITE_APP_ID (escrit pel servei de contract-deploy de docker compose
// a client/.env.local a cada 'docker compose up').
const ENV_APP_ID = import.meta.env['VITE_APP_ID']

export let APP_ID = ENV_APP_ID ? Number(ENV_APP_ID) : 1002

export function setAppIdForTest(id: number): void {
	APP_ID = id
}

// ── Client SDK ─────────────────────────────────────────────────────
export const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT)
