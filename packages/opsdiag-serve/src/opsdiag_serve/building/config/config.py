from dataclasses import dataclass

from opsdiag_serve.core import BaseServeConfig

APP_NAME = "building/config"
SERVE_APP_NAME = "opsdiag_serve_building/config"
SERVE_APP_NAME_HUMP = "opsdiag_serve_Building/config"
SERVE_CONFIG_KEY_PREFIX = "opsdiag_serve.building/config."
SERVE_SERVICE_COMPONENT_NAME = f"{SERVE_APP_NAME}_service"
# Database table name
SERVER_APP_TABLE_NAME = "opsdiag_serve_building/config"


@dataclass
class ServeConfig(BaseServeConfig):
    """Parameters for the serve command"""

    __type__ = APP_NAME

    # TODO: add your own parameters here
