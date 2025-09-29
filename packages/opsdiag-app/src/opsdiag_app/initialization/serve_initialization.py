from typing import TYPE_CHECKING, Dict, Optional, Type, TypeVar

import opsdiag_serve.datasource.serve
from opsdiag.component import SystemApp
from opsdiag_app.config import ApplicationConfig

if TYPE_CHECKING:
    from opsdiag_serve.core import BaseServeConfig

T = TypeVar("T", bound="BaseServeConfig")


def scan_serve_configs():
    """Scan serve configs."""
    from opsdiag.util.module_utils import ModelScanner, ScannerConfig
    from opsdiag_serve.core import BaseServeConfig

    modules = [
        "opsdiag_serve.agent.chat",
        "opsdiag_serve.conversation",
        "opsdiag_serve.datasource",
        "opsdiag_serve.derisks.hub",
        "opsdiag_serve.derisks.my",
        "opsdiag_serve.evaluate",
        "opsdiag_serve.feedback",
        "opsdiag_serve.file",
        "opsdiag_serve.flow",
        "opsdiag_serve.model",
        "opsdiag_serve.prompt",
        "opsdiag_serve.rag",
        "opsdiag_serve.building.app",
        "opsdiag_serve.building.config",
        "opsdiag_serve.building.recommend_question",
        "opsdiag_serve.mcp",
    ]

    scanner = ModelScanner[BaseServeConfig]()
    registered_items = {}
    for module in modules:
        config = ScannerConfig(
            module_path=module,
            base_class=BaseServeConfig,
            specific_files=["config"],
        )
        items = scanner.scan_and_register(config)
        registered_items[module] = items
    return registered_items


def get_config(
    serve_configs: Dict[str, T], serve_name: str, config_type: Type[T], **default_config
) -> T:
    """
    Get serve config with specific type

    Args:
        serve_configs: Dictionary of serve configs
        serve_name: Name of the serve config to get
        config_type: The specific config type to return
        **default_config: Default values for config attributes

    Returns:
        Config instance of type T
    """
    if hasattr(config_type, "__type__"):
        # Use the type name as the serve name
        serve_name = config_type.__type__

    config = serve_configs.get(serve_name)
    if not config:
        config = config_type(**default_config)
    else:
        if default_config:
            for k, v in default_config.items():
                if hasattr(config, k) and getattr(config, k) is None:
                    setattr(config, k, v)
    return config


def register_serve_apps(
    system_app: SystemApp,
    app_config: ApplicationConfig,
    webserver_host: str,
    webserver_port: int,
):
    """Register serve apps"""
    serve_configs = {s.get_type_value(): s for s in app_config.serves}

    system_app.config.set("opsdiag.app.global.language", app_config.system.language)
    global_api_keys: Optional[str] = None
    if app_config.system.api_keys:
        global_api_keys = ",".join(app_config.system.api_keys)
        system_app.config.set("opsdiag.app.global.api_keys", global_api_keys)
    if app_config.system.encrypt_key:
        system_app.config.set(
            "opsdiag.app.global.encrypt_key", app_config.system.encrypt_key
        )

    # ################################ Prompt Serve Register Begin ####################
    from opsdiag_serve.prompt.serve import (
        Serve as PromptServe,
    )

    # Register serve app
    system_app.register(
        PromptServe,
        api_prefix="/prompt",
        config=get_config(
            serve_configs,
            PromptServe.name,
            opsdiag_serve.prompt.serve.ServeConfig,
            default_user="derisk",
            default_sys_code="derisk",
            api_keys=global_api_keys,
        ),
    )
    # ################################ Prompt Serve Register End ######################

    # ################################ Conversation Serve Register Begin ##############
    from opsdiag_serve.conversation.serve import Serve as ConversationServe

    # Register serve app
    system_app.register(
        ConversationServe,
        api_prefix="/api/v1/chat/dialogue",
        config=get_config(
            serve_configs,
            ConversationServe.name,
            opsdiag_serve.conversation.serve.ServeConfig,
            default_model=app_config.models.default_llm,
            api_keys=global_api_keys,
        ),
    )
    # ################################ Conversation Serve Register End ################

    # ################################ AWEL Flow Serve Register Begin #################
    from opsdiag_serve.flow.serve import Serve as FlowServe

    # Register serve app
    system_app.register(
        FlowServe,
        config=get_config(
            serve_configs,
            FlowServe.name,
            opsdiag_serve.flow.serve.ServeConfig,
            encrypt_key=app_config.system.encrypt_key,
            api_keys=global_api_keys,
        ),
    )

    # ################################ AWEL Flow Serve Register End ###################

    # ################################ Rag Serve Register Begin #######################

    from opsdiag_serve.rag.serve import Serve as RagServe

    rag_config = app_config.rag
    llm_configs = app_config.models

    # Register serve app
    system_app.register(
        RagServe,
        config=get_config(
            serve_configs,
            RagServe.name,
            opsdiag_serve.rag.serve.ServeConfig,
            embedding_model=llm_configs.default_embedding,
            rerank_model=llm_configs.default_reranker,
            chunk_size=rag_config.chunk_size,
            chunk_overlap=rag_config.chunk_overlap,
            similarity_top_k=rag_config.similarity_top_k,
            query_rewrite=rag_config.query_rewrite,
            max_chunks_once_load=rag_config.max_chunks_once_load,
            max_threads=rag_config.max_threads,
            rerank_top_k=rag_config.rerank_top_k,
            api_keys=global_api_keys,
        ),
    )

    # ################################ Rag Serve Register End #########################

    # ################################ Datasource Serve Register Begin ################

    from opsdiag_serve.datasource.serve import Serve as DatasourceServe

    # Register serve app
    system_app.register(
        DatasourceServe,
        config=get_config(
            serve_configs,
            DatasourceServe.name,
            opsdiag_serve.datasource.serve.ServeConfig,
            api_keys=global_api_keys,
        ),
    )

    # ################################ Datasource Serve Register End ##################

    # ################################ Chat Feedback Serve Register End ###############
    from opsdiag_serve.feedback.serve import Serve as FeedbackServe

    # Register serve feedback
    system_app.register(
        FeedbackServe,
        config=get_config(
            serve_configs,
            FeedbackServe.name,
            opsdiag_serve.feedback.serve.ServeConfig,
            api_keys=global_api_keys,
        ),
    )
    # ################################ Chat Feedback Register End #####################

    # ################################ derisks Register Begin ##########################
    # Register serve deriskshub
    from opsdiag_serve.derisks.hub.serve import Serve as derisksHubServe

    system_app.register(
        derisksHubServe,
        config=get_config(
            serve_configs,
            derisksHubServe.name,
            opsdiag_serve.derisks.hub.serve.ServeConfig,
            api_keys=global_api_keys,
        ),
    )
    # Register serve derisksmy
    from opsdiag_serve.derisks.my.serve import Serve as derisksMyServe

    system_app.register(
        derisksMyServe,
        config=get_config(
            serve_configs,
            derisksMyServe.name,
            opsdiag_serve.derisks.my.serve.ServeConfig,
            api_keys=global_api_keys,
        ),
    )
    # ################################ derisks Register End ############################

    # ################################ File Serve Register Begin ######################

    from opsdiag.configs.model_config import FILE_SERVER_LOCAL_STORAGE_PATH
    from opsdiag_serve.file.serve import Serve as FileServe

    local_storage_path = f"{FILE_SERVER_LOCAL_STORAGE_PATH}_{webserver_port}"
    # Register serve app
    system_app.register(
        FileServe,
        config=get_config(
            serve_configs,
            FileServe.name,
            opsdiag_serve.file.serve.ServeConfig,
            host=webserver_host,
            port=webserver_port,
            local_storage_path=local_storage_path,
            api_keys=global_api_keys,
        ),
    )

    # ################################ File Serve Register End ########################

    # ################################ Evaluate Serve Register Begin ##################
    from opsdiag_serve.evaluate.serve import Serve as EvaluateServe

    rag_config = app_config.rag
    llm_configs = app_config.models
    # Register serve Evaluate
    system_app.register(
        EvaluateServe,
        config=get_config(
            serve_configs,
            EvaluateServe.name,
            opsdiag_serve.evaluate.serve.ServeConfig,
            embedding_model=llm_configs.default_embedding,
            similarity_top_k=rag_config.similarity_top_k,
            api_keys=global_api_keys,
        ),
    )
    # ################################ Evaluate Serve Register End ####################

    # ################################ Model Serve Register Begin #####################
    from opsdiag_serve.model.serve import Serve as ModelServe

    # Register serve model
    system_app.register(
        ModelServe,
        config=get_config(
            serve_configs,
            ModelServe.name,
            opsdiag_serve.model.serve.ServeConfig,
            model_storage=app_config.service.web.model_storage,
            api_keys=global_api_keys,
        ),
    )
    # ################################ Model Serve Register End #######################

    # ################################ App Building Serve Register Begin #####################
    from opsdiag_serve.building.app.serve import Serve as AppServe
    from opsdiag_serve.building.config.serve import Serve as AppConfigServe
    from opsdiag_serve.building.recommend_question.serve import Serve as RecommendQuestionServe

    # Register serve model
    system_app.register(
        AppServe,
        config=get_config(
            serve_configs,
            AppServe.name,
            opsdiag_serve.building.app.serve.ServeConfig,
            api_keys=global_api_keys,
        ),
    )
    system_app.register(
        AppConfigServe,
        config=get_config(
            serve_configs,
            AppConfigServe.name,
            opsdiag_serve.building.config.serve.ServeConfig,
            api_keys=global_api_keys,
        ),
    )
    system_app.register(
        RecommendQuestionServe,
        config=get_config(
            serve_configs,
            RecommendQuestionServe.name,
            opsdiag_serve.building.recommend_question.serve.ServeConfig,
            api_keys=global_api_keys,
        ),
    )
    # ################################ App Building Serve Register End #####################

    # ################################ MCP Serve Register Begin #####################
    from opsdiag_serve.mcp.serve import Serve as MCPServe

    # Register serve model
    system_app.register(
        MCPServe,
        config=get_config(
            serve_configs,
            MCPServe.name,
            opsdiag_serve.mcp.serve.ServeConfig,
            api_keys=global_api_keys,
        ),
    )
    # ################################ MCP Serve Register End   #####################