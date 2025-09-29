import logging
import os
import sys
from typing import List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html

# fastapi import time cost about 0.05s
from fastapi.staticfiles import StaticFiles

from opsdiag._version import version
from opsdiag.component import SystemApp
from opsdiag.configs.model_config import (
    LOGDIR,
    STATIC_MESSAGE_IMG_PATH,
)
from opsdiag.util.fastapi import create_app, replace_router
from opsdiag.util.i18n_utils import _, set_default_language
from opsdiag.util.parameter_utils import _get_dict_from_obj
from opsdiag.util.system_utils import get_system_info
from opsdiag.util.tracer import SpanType, SpanTypeRunName, initialize_tracer, root_tracer
from opsdiag.util.logger import (
    logging_str_to_uvicorn_level,
    setup_http_service_logging,
    setup_logging,
)
from opsdiag_app.base import (
    _create_model_start_listener,
    _migration_db_storage,
    server_init,
)

# initialize_components import time cost about 0.1s
from opsdiag_app.component_configs import initialize_components
from opsdiag_app.config import ApplicationConfig, ServiceWebParameters, SystemParameters
from opsdiag_serve.core import add_exception_handler

logger = logging.getLogger(__name__)
ROOT_PATH = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(ROOT_PATH)

app = create_app(
    title=_("OpsDiag Open API"),
    description=_("OpsDiag Open API"),
    version=version,
    openapi_tags=[],
)
# Use custom router to support priority
replace_router(app)

system_app = SystemApp(app)


def mount_routers(app: FastAPI, param: Optional[ApplicationConfig] = None):
    """Lazy import to avoid high time cost"""
    from opsdiag_app.knowledge.api import router as knowledge_router
    from opsdiag_app.openapi.api_v1.api_v1 import router as api_v1
    from opsdiag_app.openapi.api_v1.feedback.api_fb_v1 import router as api_fb_v1
    from opsdiag_app.openapi.api_v2.api_v2 import router as api_v2
    from opsdiag_serve.agent.app.controller import router as gpts_v1

    app.include_router(api_v1, prefix="/api", tags=["Chat"])
    app.include_router(api_v2, prefix="/api", tags=["ChatV2"])
    app.include_router(api_fb_v1, prefix="/api", tags=["FeedBack"])
    app.include_router(gpts_v1, prefix="/api", tags=["GptsApp"])

    app.include_router(knowledge_router, tags=["Knowledge"])

    from opsdiag_serve.agent.app.recommend_question.controller import (
        router as recommend_question_v1,
    )

    app.include_router(recommend_question_v1, prefix="/api", tags=["RecommendQuestion"])

    ##  ⬇️⬇️⬇️⬇️⬇️⬇️
    ## 启动MCP注册中心， 默认关闭，线下调试使用可手动开启
    if param and param.mcp.enable_mcp_gateway:
        from opsdiag_ext.mcp.gateway import McpserverParam, run_mcp_port
        mcp_server_param = McpserverParam()
        run_mcp_port(app, mcp_server_param)
    ## ⬆️⬆️⬆️⬆️⬆️⬆️


def mount_static_files(app: FastAPI, param: ApplicationConfig):
    if param.service.web.new_web_ui:
        static_file_path = os.path.join(ROOT_PATH, "src", "opsdiag_app/static/web")
    else:
        static_file_path = os.path.join(ROOT_PATH, "src", "opsdiag_app/static/old_web")

    os.makedirs(STATIC_MESSAGE_IMG_PATH, exist_ok=True)
    app.mount(
        "/images",
        StaticFiles(directory=STATIC_MESSAGE_IMG_PATH, html=True),
        name="static2",
    )
    # app.mount(
    #     "/_next/static", StaticFiles(directory=static_file_path + "/_next/static")
    # )
    app.mount("/", StaticFiles(directory=static_file_path, html=True), name="static")

    app.mount(
        "/swagger_static",
        StaticFiles(directory=static_file_path),
        name="swagger_static",
    )


add_exception_handler(app)


@app.get("/doc", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title="Custom Swagger UI",
        swagger_js_url="/swagger_static/swagger-ui-bundle.js",
        swagger_css_url="/swagger_static/swagger-ui.css",
    )


def initialize_app(param: ApplicationConfig, args: List[str] = None):
    """Initialize app
    If you use gunicorn as a process manager, initialize_app can be invoke in
    `on_starting` hook.
    Args:
        param:WebWerverParameters
        args:List[str]
    """

    # import after param is initialized, accelerate --help speed
    from opsdiag.model.cluster import initialize_worker_manager_in_client

    web_config = param.service.web
    print(param)

    server_init(param, system_app)
    mount_routers(app, param)
    model_start_listener = _create_model_start_listener(system_app)

    # Migration db storage, so you db models must be imported before this
    _migration_db_storage(
        param.service.web.database, web_config.disable_alembic_upgrade
    )

    initialize_components(
        param,
        system_app,
    )
    system_app.on_init()



    # After init, when the database is ready
    system_app.after_init()

    binding_port = web_config.port
    binding_host = web_config.host
    if not web_config.light:
        from opsdiag.model.cluster.storage import ModelStorage
        from opsdiag_serve.model.serve import Serve as ModelServe

        logger.info(
            "Model Unified Deployment Mode, run all services in the same process"
        )
        model_serve = ModelServe.get_instance(system_app)
        # Persistent model storage
        model_storage = ModelStorage(model_serve.model_storage)
        initialize_worker_manager_in_client(
            worker_params=param.service.model.worker,
            models_config=param.models,
            app=app,
            binding_port=binding_port,
            binding_host=binding_host,
            start_listener=model_start_listener,
            system_app=system_app,
            model_storage=model_storage,
        )

    else:
        # MODEL_SERVER is controller address now
        controller_addr = web_config.controller_addr
        param.models.llms = []
        param.models.rerankers = []
        param.models.embeddings = []
        initialize_worker_manager_in_client(
            worker_params=param.service.model.worker,
            models_config=param.models,
            app=app,
            run_locally=False,
            controller_addr=controller_addr,
            binding_port=binding_port,
            binding_host=binding_host,
            start_listener=model_start_listener,
            system_app=system_app,
        )

    mount_static_files(app, param)

    # Before start, after on_init
    system_app.before_start()
    return param


def run_uvicorn(param: ServiceWebParameters):
    import uvicorn

    setup_http_service_logging()

    # https://github.com/encode/starlette/issues/617
    cors_app = CORSMiddleware(
        app=app,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )
    log_level = "info"
    if param.log:
        log_level = logging_str_to_uvicorn_level(param.log.level)
    uvicorn.run(
        cors_app,
        host=param.host,
        port=param.port,
        log_level=log_level,
    )


def run_webserver(config_file: str):
    # Load configuration with specified config file
    param = load_config(config_file)
    trace_config = param.service.web.trace or param.trace
    trace_file = trace_config.file or os.path.join(
        LOGDIR or "logs", "opsdiag_webserver_tracer.jsonl"
    )
    config = system_app.config
    config.configs["app_config"] = param
    initialize_tracer(
        trace_file,
        system_app=system_app,
        root_operation_name=trace_config.root_operation_name or "OpsDiag-Webserver",
        tracer_parameters=trace_config,
    )

    with root_tracer.start_span(
        "run_webserver",
        span_type=SpanType.RUN,
        metadata={
            "run_service": SpanTypeRunName.WEBSERVER,
            "params": _get_dict_from_obj(param),
            "sys_infos": _get_dict_from_obj(get_system_info()),
        },
    ):
        param = initialize_app(param)

        run_uvicorn(param.service.web)


def scan_configs():
    from opsdiag.model import scan_model_providers
    from opsdiag_app.initialization.serve_initialization import scan_serve_configs
    from opsdiag_ext.storage import scan_storage_configs
    from opsdiag_serve.datasource.manages.connector_manager import ConnectorManager

    cm = ConnectorManager(system_app)
    # pre import all connectors
    cm.on_init()
    # Register all model providers
    scan_model_providers()
    # Register all serve configs
    scan_serve_configs()
    # Register all storage configs
    scan_storage_configs()


def load_config(config_file: str = None) -> ApplicationConfig:
    from opsdiag.configs.model_config import ROOT_PATH as OPSDIAG_ROOT_PATH

    if config_file is None:
        config_file = os.path.join(
            OPSDIAG_ROOT_PATH, "configs", "opsdiag-siliconflow.toml"
        )
    elif not os.path.isabs(config_file):
        # If config_file is a relative path, make it relative to DERISK_ROOT_PATH
        config_file = os.path.join(OPSDIAG_ROOT_PATH, config_file)

    if not os.path.exists(config_file):
        raise FileNotFoundError(f"Configuration file not found: {config_file}")
    from opsdiag.util.configure import ConfigurationManager

    logger.info(f"Loading configuration from: {config_file}")
    cfg = ConfigurationManager.from_file(config_file)
    sys_config = cfg.parse_config(SystemParameters, prefix="system")
    # Must set default language before any i18n usage
    set_default_language(sys_config.language)

    # Scan all configs
    scan_configs()

    app_config = cfg.parse_config(ApplicationConfig, hook_section="hooks")
    return app_config


def parse_args():
    import argparse

    parser = argparse.ArgumentParser(description="OpsDiag Webserver")
    parser.add_argument(
        "-c",
        "--config",
        type=str,
        default=None,
        help="Path to the configuration file. Default: configs/opsdiag-siliconflow.toml",
    )
    return parser.parse_args()


if __name__ == "__main__":
    # Parse command line arguments
    _args = parse_args()
    _config_file = _args.config
    run_webserver(_config_file)
