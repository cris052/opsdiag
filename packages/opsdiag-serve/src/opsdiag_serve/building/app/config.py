from dataclasses import dataclass

from opsdiag_serve.core import BaseServeConfig

APP_NAME = "app"
SERVE_APP_NAME = "opsdiag_serve_app"
SERVE_APP_NAME_HUMP = "opsdiag_serve_App"
SERVE_CONFIG_KEY_PREFIX = "opsdiag_serve.app."
SERVE_SERVICE_COMPONENT_NAME = f"{SERVE_APP_NAME}_service"
# Database table name
SERVER_APP_TABLE_NAME = "gpts_app"
SERVER_APP_DETAIL_TABLE_NAME = "gpts_app_detail"

@dataclass
class ServeConfig(BaseServeConfig):
    """Parameters for the serve command"""

    __type__ = APP_NAME

    # TODO: add your own parameters here
