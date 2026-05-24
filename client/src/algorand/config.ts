import algosdk from 'algosdk'

const ALGOD_SERVER = import.meta.env['VITE_ALGOD_SERVER'] ?? 'http://localhost'
const ALGOD_PORT = Number(import.meta.env['VITE_ALGOD_PORT'] ?? 4001)
const ALGOD_TOKEN = import.meta.env['VITE_ALGOD_TOKEN'] ?? 'a'.repeat(64)

export const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT)
