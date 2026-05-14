import algosdk from 'algosdk';

// ── Configuració LocalNet ──────────────────────────────────────────
// Utilitza localhost perquè el contenidor Docker pugui arribar
// a AlgoKit LocalNet que s'executa a la màquina amfitriona.
const ALGOD_SERVER = 'http://localhost';
const ALGOD_PORT = 4001;
const ALGOD_TOKEN = import.meta.env.VITE_ALGOD_TOKEN ?? 'a'.repeat(64);

// ── App ID del contracte ─────────────────────────────────────────────────
// Configurat via VITE_APP_ID (escrit pel servei de contract-deploy de docker compose
// a client/.env.local a cada 'docker compose up').
const ENV_APP_ID = import.meta.env.VITE_APP_ID;

export let APP_ID = ENV_APP_ID ? Number(ENV_APP_ID) : 1002;

export function setAppIdForTest(id: number) {
  APP_ID = id;
}

// ── Client SDK ─────────────────────────────────────────────────────
export const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);
