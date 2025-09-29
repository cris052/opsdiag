from dataclasses import dataclass

from opsdiag.core.awel.flow import (
    TAGS_ORDER_HIGH,
    ResourceCategory,
    auto_register_resource,
)
from opsdiag.util.i18n_utils import _
from opsdiag_serve.core import BaseServeConfig

APP_NAME = "derisks_hub"
SERVE_APP_NAME = "opsdiag_serve_derisks_hub"
SERVE_APP_NAME_HUMP = "opsdiag_serve_DerisksHub"
SERVE_CONFIG_KEY_PREFIX = "opsdiag.serve.derisks_hub."
SERVE_SERVICE_COMPONENT_NAME = f"{SERVE_APP_NAME}_service"
# Database table name
SERVER_APP_TABLE_NAME = SERVE_APP_NAME


@auto_register_resource(
    label=_("Hub derisks Serve Configurations"),
    category=ResourceCategory.COMMON,
    tags={"order": TAGS_ORDER_HIGH},
    description=_("This configuration is for the hub derisks serve module."),
    show_in_ui=False,
)
@dataclass
class ServeConfig(BaseServeConfig):
    """Parameters for the serve command"""

    __type__ = APP_NAME
