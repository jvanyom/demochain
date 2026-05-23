import logging
import os

import algokit_utils

logger = logging.getLogger(__name__)


def deploy() -> None:
    from smart_contracts.artifacts.demochain.Demochain_client import (
        DemochainFactory
    )

    algorand = algokit_utils.AlgorandClient.from_environment()
    if os.getenv("DEPLOYER_MNEMONIC"):
        deployer = algorand.account.from_environment("DEPLOYER")
    else:
        deployer = algorand.account.localnet_dispenser()

    factory = algorand.client.get_typed_app_factory(DemochainFactory, default_sender=deployer.address)

    app_client, _create_result = factory.send.create.bare()

    if True:
        algorand.send.payment(
            algokit_utils.PaymentParams(
                amount=algokit_utils.AlgoAmount(algo=1),
                sender=deployer.address,
                receiver=app_client.app_address,
            )
        )

    logger.info(f"Deployed {app_client.app_name} with app_id={app_client.app_id} at {app_client.app_address}")
