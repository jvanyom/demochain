"""Heartbeat per al LocalNet d'Algorand en DevMode.

En DevMode, algod només mina un bloc nou quan rep una transacció. Això
deixa `Global.latest_timestamp` congelat entre transaccions, i els
asserts del contracte sobre finestres de votació (starting_date /
ending_date) no es comporten com a producció.

Aquest script submiteix periòdicament una `PaymentTxn` de 0 microAlgos
amb el remitent enviant-se a sí mateix (no-op), cosa que força la
creació d'un bloc i fa avançar `latest_timestamp` al wall-clock real.

Cost: una min-fee per heartbeat (1000 microAlgos) per a un compte de
gènesi amb saldo de ~4×10^15 microAlgos.
"""

import logging
import os
import time

from algosdk import kmd, transaction
from algosdk.v2client import algod

logging.basicConfig(
    level=logging.INFO,
    format="[heartbeat] %(asctime)s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


def _env(name: str, default: str) -> str:
    return os.environ.get(name, default)


def _pick_funded_account(algod_client: algod.AlgodClient, addresses: list[str]) -> tuple[str, int]:
    """Retorna l'adreça amb el saldo més alt de la llista."""
    best_addr = ""
    best_balance = -1
    for addr in addresses:
        try:
            info = algod_client.account_info(addr)
            bal = info.get("amount", 0)
        except Exception:
            continue
        if bal > best_balance:
            best_balance = bal
            best_addr = addr
    if not best_addr:
        raise RuntimeError("no funded accounts found in wallet")
    return best_addr, best_balance


def main() -> None:
    algod_url = _env("ALGOD_URL", "http://algod:8080")
    algod_token = _env("ALGO_TOKEN", "a" * 64)
    kmd_url = _env("KMD_URL", "http://algod:7833")
    kmd_token = _env("KMD_TOKEN", algod_token)
    wallet_name = _env("KMD_WALLET_NAME", "unencrypted-default-wallet")
    wallet_password = _env("KMD_WALLET_PASSWORD", "")
    interval = int(_env("HEARTBEAT_INTERVAL_SEC", "3"))

    log.info("algod=%s kmd=%s wallet=%r interval=%ds", algod_url, kmd_url, wallet_name, interval)

    algod_client = algod.AlgodClient(algod_token, algod_url)
    kmd_client = kmd.KMDClient(kmd_token, kmd_url)

    wallets = kmd_client.list_wallets()
    wallet_id = next((w["id"] for w in wallets if w["name"] == wallet_name), None)
    if not wallet_id:
        available = [w["name"] for w in wallets]
        raise RuntimeError(f"wallet {wallet_name!r} not found; available={available}")

    handle = kmd_client.init_wallet_handle(wallet_id, wallet_password)
    addresses = kmd_client.list_keys(handle)
    sender, balance = _pick_funded_account(algod_client, addresses)
    log.info("sender=%s balance=%d microAlgos", sender, balance)

    consecutive_errors = 0
    while True:
        try:
            params = algod_client.suggested_params()
            note = f"hb-{int(time.time())}".encode()
            txn = transaction.PaymentTxn(sender, params, sender, 0, note=note)
            signed = kmd_client.sign_transaction(handle, wallet_password, txn)
            tx_id = algod_client.send_transaction(signed)
            status = algod_client.status()
            log.info("tx=%s round=%d ts=%d", tx_id, status.get("last-round", -1), int(time.time()))
            consecutive_errors = 0
        except Exception as exc:
            consecutive_errors += 1
            log.warning("error (%d in a row): %s", consecutive_errors, exc)
            if consecutive_errors >= 3:
                log.info("reinitialising wallet handle")
                try:
                    handle = kmd_client.init_wallet_handle(wallet_id, wallet_password)
                except Exception as e:
                    log.error("handle re-init failed: %s", e)
        time.sleep(interval)


if __name__ == "__main__":
    main()
