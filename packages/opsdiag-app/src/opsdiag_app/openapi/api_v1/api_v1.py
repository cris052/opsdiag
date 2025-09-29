import asyncio
import datetime
import json
import logging
import os
import time
import uuid
from concurrent.futures import Executor
from typing import List, Optional, cast

import pandas as pd
from fastapi import APIRouter, Body, Depends, File, Query, UploadFile, BackgroundTasks
from fastapi.responses import StreamingResponse

from opsdiag._private.config import Config
from opsdiag.component import ComponentType
from opsdiag.configs import TAG_KEY_KNOWLEDGE_CHAT_DOMAIN_TYPE
from opsdiag.core import ModelOutput, HumanMessage
from opsdiag.core.awel import BaseOperator, CommonLLMHttpRequestBody
from opsdiag.core.awel.dag.dag_manager import DAGManager
from opsdiag.core.awel.util.chat_util import safe_chat_stream_with_dag_task
from opsdiag.core.interface.file import FileStorageClient
from opsdiag.core.schema.api import ChatCompletionResponseChoice, ChatMessage, UsageInfo, ChatCompletionResponse
from opsdiag.model.base import FlatSupportedModel
from opsdiag.model.cluster import (
    BaseModelController,
    WorkerManager,
    WorkerManagerFactory,
)
from opsdiag.util.data_util import first
from opsdiag.util.executor_utils import (
    DefaultExecutorFactory,
    ExecutorFactory,
)
from opsdiag.util.file_client import FileClient
from opsdiag.util.tracer import SpanType, root_tracer
from opsdiag_app.knowledge.request.request import KnowledgeSpaceRequest
from opsdiag_app.knowledge.service import KnowledgeService
from opsdiag_app.openapi.api_view_model import (
    ChatCompletionResponseStreamChoice,
    ChatCompletionStreamResponse,
    ChatSceneVo,
    ConversationVo,
    DeltaMessage,
    MessageVo,
    Result,
)
from opsdiag_serve.agent.agents.controller import multi_agents
from opsdiag_serve.agent.db.gpts_app import UserRecentAppsDao
from opsdiag_serve.agent.team.base import TeamMode
from opsdiag_serve.core import blocking_func_to_async
from opsdiag_serve.datasource.manages.db_conn_info import DBConfig, DbTypeInfo
from opsdiag_serve.datasource.service.db_summary_client import DBSummaryClient
from opsdiag_serve.flow.service.service import Service as FlowService
from opsdiag_serve.utils.auth import UserRequest, get_user_from_headers

router = APIRouter()
CFG = Config()
logger = logging.getLogger(__name__)
knowledge_service = KnowledgeService()

model_semaphore = None
global_counter = 0

user_recent_app_dao = UserRecentAppsDao()


def __get_conv_user_message(conversations: dict):
    messages = conversations["messages"]
    for item in messages:
        if item["type"] == "human":
            return item["data"]["content"]
    return ""


def __new_conversation(team_mode, user_name: str, sys_code: str) -> ConversationVo:
    unique_id = uuid.uuid1()
    return ConversationVo(
        conv_uid=str(unique_id),
        team_mode=team_mode,
        user_name=user_name,
        sys_code=sys_code,
    )


def get_db_list(user_id: str = None):
    dbs = CFG.local_db_manager.get_db_list(user_id=user_id)
    db_params = []
    for item in dbs:
        params: dict = {}
        params.update({"param": item["db_name"]})
        params.update({"type": item["db_type"]})
        db_params.append(params)
    return db_params


def plugins_select_info():
    plugins_infos: dict = {}
    for plugin in CFG.plugins:
        plugins_infos.update(
            {f"【{plugin._name}】=>{plugin._description}": plugin._name}
        )
    return plugins_infos


def get_db_list_info(user_id: str = None):
    dbs = CFG.local_db_manager.get_db_list(user_id=user_id)
    params: dict = {}
    for item in dbs:
        comment = item["comment"]
        if comment is not None and len(comment) > 0:
            params.update({item["db_name"]: comment})
    return params


def knowledge_list_info():
    """return knowledge space list"""
    params: dict = {}
    request = KnowledgeSpaceRequest()
    spaces = knowledge_service.get_knowledge_space(request)
    for space in spaces:
        params.update({space.name: space.desc})
    return params


def knowledge_list(user_id: str = None):
    """return knowledge space list"""
    request = KnowledgeSpaceRequest(user_id=user_id)
    spaces = knowledge_service.get_knowledge_space(request)
    space_list = []
    for space in spaces:
        params: dict = {}
        params.update({"param": space.name})
        params.update({"type": "space"})
        params.update({"space_id": space.id})
        space_list.append(params)
    return space_list


def get_model_controller() -> BaseModelController:
    controller = CFG.SYSTEM_APP.get_component(
        ComponentType.MODEL_CONTROLLER, BaseModelController
    )
    return controller


def get_worker_manager() -> WorkerManager:
    worker_manager = CFG.SYSTEM_APP.get_component(
        ComponentType.WORKER_MANAGER_FACTORY, WorkerManagerFactory
    ).create()
    return worker_manager


def get_fs() -> FileStorageClient:
    return FileStorageClient.get_instance(CFG.SYSTEM_APP)


def get_dag_manager() -> DAGManager:
    """Get the global default DAGManager"""
    return DAGManager.get_instance(CFG.SYSTEM_APP)


def get_chat_flow() -> FlowService:
    """Get Chat Flow Service."""
    return FlowService.get_instance(CFG.SYSTEM_APP)


def get_executor() -> Executor:
    """Get the global default executor"""
    return CFG.SYSTEM_APP.get_component(
        ComponentType.EXECUTOR_DEFAULT,
        ExecutorFactory,
        or_register_component=DefaultExecutorFactory,
    ).create()


@router.get("/v1/chat/db/list", response_model=Result)
async def db_connect_list(
        db_name: Optional[str] = Query(default=None, description="database name"),
        user_info: UserRequest = Depends(get_user_from_headers),
):
    results = CFG.local_db_manager.get_db_list(
        db_name=db_name, user_id=user_info.user_id
    )
    # 排除部分数据库不允许用户访问
    if results and len(results):
        results = [
            d
            for d in results
            if d.get("db_name") not in ["auth", "derisk", "test", "public"]
        ]
    return Result.succ(results)


@router.post("/v1/chat/db/add", response_model=Result)
async def db_connect_add(
        db_config: DBConfig = Body(),
        user_token: UserRequest = Depends(get_user_from_headers),
):
    return Result.succ(CFG.local_db_manager.add_db(db_config, user_token.user_id))


@router.get("/v1/permission/db/list", response_model=Result[List])
async def permission_db_list(
        db_name: str = None,
        user_token: UserRequest = Depends(get_user_from_headers),
):
    return Result.succ()


@router.post("/v1/chat/db/edit", response_model=Result)
async def db_connect_edit(
        db_config: DBConfig = Body(),
        user_token: UserRequest = Depends(get_user_from_headers),
):
    return Result.succ(CFG.local_db_manager.edit_db(db_config))


@router.post("/v1/chat/db/delete", response_model=Result[bool])
async def db_connect_delete(db_name: str = None):
    CFG.local_db_manager.db_summary_client.delete_db_profile(db_name)
    return Result.succ(CFG.local_db_manager.delete_db(db_name))


@router.post("/v1/chat/db/refresh", response_model=Result[bool])
async def db_connect_refresh(db_config: DBConfig = Body()):
    CFG.local_db_manager.db_summary_client.delete_db_profile(db_config.db_name)
    success = await CFG.local_db_manager.async_db_summary_embedding(
        db_config.db_name, db_config.db_type
    )
    return Result.succ(success)


async def async_db_summary_embedding(db_name, db_type):
    db_summary_client = DBSummaryClient(system_app=CFG.SYSTEM_APP)
    db_summary_client.db_summary_embedding(db_name, db_type)


@router.post("/v1/chat/db/test/connect", response_model=Result[bool])
async def test_connect(
        db_config: DBConfig = Body(),
        user_token: UserRequest = Depends(get_user_from_headers),
):
    try:
        # TODO Change the synchronous call to the asynchronous call
        CFG.local_db_manager.test_connect(db_config)
        return Result.succ(True)
    except Exception as e:
        return Result.failed(code="E1001", msg=str(e))


@router.post("/v1/chat/db/summary", response_model=Result[bool])
async def db_summary(db_name: str, db_type: str):
    # TODO Change the synchronous call to the asynchronous call
    async_db_summary_embedding(db_name, db_type)
    return Result.succ(True)


@router.get("/v1/chat/db/support/type", response_model=Result[List[DbTypeInfo]])
async def db_support_types():
    support_types = CFG.local_db_manager.get_all_completed_types()
    db_type_infos = []
    for type in support_types:
        db_type_infos.append(
            DbTypeInfo(db_type=type.value(), is_file_db=type.is_file_db())
        )
    return Result[DbTypeInfo].succ(db_type_infos)


@router.post("/v1/resource/params/list", response_model=Result[List[dict]])
async def resource_params_list(
        resource_type: str,
        user_token: UserRequest = Depends(get_user_from_headers),
):
    if resource_type == "database":
        result = get_db_list()
    elif resource_type == "knowledge":
        result = knowledge_list()
    elif resource_type == "tool":
        result = plugins_select_info()
    else:
        return Result.succ()
    return Result.succ(result)

@router.post("/v1/resource/file/upload")
async def file_upload(
        chat_mode: str,
        conv_uid: str,
        temperature: Optional[float] = None,
        max_new_tokens: Optional[int] = None,
        sys_code: Optional[str] = None,
        model_name: Optional[str] = None,
        doc_files: List[UploadFile] = File(...),
        user_token: UserRequest = Depends(get_user_from_headers),
        fs: FileStorageClient = Depends(get_fs),
):
    logger.info(
        f"file_upload:{conv_uid}, files:{[file.filename for file in doc_files]}"
    )

    bucket = "derisk_app_file"
    file_params = []

    for doc_file in doc_files:
        file_name = doc_file.filename
        custom_metadata = {
            "user_name": user_token.user_id,
            "sys_code": sys_code,
            "conv_uid": conv_uid,
        }

        file_uri = await blocking_func_to_async(
            CFG.SYSTEM_APP,
            fs.save_file,
            bucket,
            file_name,
            doc_file.file,
            custom_metadata=custom_metadata,
        )

        _, file_extension = os.path.splitext(file_name)
        file_param = {
            "is_oss": True,
            "file_path": file_uri,
            "file_name": file_name,
            "file_learning": False,
            "bucket": bucket,
        }
        file_params.append(file_param)

    # If only one file was uploaded, return the single file_param directly
    # Otherwise return the array of file_params
    result = file_params[0] if len(file_params) == 1 else file_params
    return Result.succ(result)


@router.post("/v1/resource/file/delete")
async def file_delete(
        conv_uid: str,
        file_key: str,
        user_name: Optional[str] = None,
        sys_code: Optional[str] = None,
        user_token: UserRequest = Depends(get_user_from_headers),
):
    logger.info(f"file_delete:{conv_uid},{file_key}")
    oss_file_client = FileClient()

    return Result.succ(
        await oss_file_client.delete_file(conv_uid=conv_uid, file_key=file_key)
    )


@router.post("/v1/resource/file/read")
async def file_read(
        conv_uid: str,
        file_key: str,
        user_name: Optional[str] = None,
        sys_code: Optional[str] = None,
        user_token: UserRequest = Depends(get_user_from_headers),
):
    logger.info(f"file_read:{conv_uid},{file_key}")
    file_client = FileClient()
    res = await file_client.read_file(conv_uid=conv_uid, file_key=file_key)
    df = pd.read_excel(res, index_col=False)
    return Result.succ(df.to_json(orient="records", date_format="iso", date_unit="s"))


def get_hist_messages(conv_uid: str, user_name: str = None):
    from opsdiag_serve.conversation.service.service import Service as ConversationService

    instance: ConversationService = ConversationService.get_instance(CFG.SYSTEM_APP)
    return instance.get_history_messages({"conv_uid": conv_uid, "user_name": user_name})


@router.post("/v1/chat/stop")
async def chat_stop(
        conv_session_id: str ,
        user_token: UserRequest = Depends(get_user_from_headers),
):
    logger.info(f"chat_stop:{conv_session_id}")
    try:
        multi_agents.stop_chat(conv_session_id, user_token.user_id if user_token else None)
    except Exception as e:
        logger.exception("停止对话异常！")
        return Result.failed(msg=f"停止对话失败！{str(e)}")


@router.post("/v1/chat/completions")
async def chat_completions(
        background_tasks: BackgroundTasks,
        dialogue: ConversationVo = Body(),
        flow_service: FlowService = Depends(get_chat_flow),
        user_token: UserRequest = Depends(get_user_from_headers),
):
    logger.info(
        f"chat_completions:{dialogue.team_mode},{dialogue.select_param},"
        f"{dialogue.model_name}, timestamp={int(time.time() * 1000)}"
    )

    if not dialogue.conv_uid:
        dialogue.conv_uid = uuid.uuid1().hex
    dialogue.user_name = user_token.user_id if user_token else dialogue.user_name
    dialogue.ext_info.update(
        {
            "trace_id": first(
                root_tracer.get_context_trace_id(), default=uuid.uuid4().hex
            )
        }
    )
    dialogue.ext_info.update({"rpc_id": "0.1"})

    headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Transfer-Encoding": "chunked",
    }
    try:
        if dialogue.team_mode == TeamMode.NATIVE_APP.value:
            with root_tracer.start_span(
                    "get_chat_instance", span_type=SpanType.CHAT, metadata=dialogue.dict()
            ):
                in_message = HumanMessage.parse_chat_completion_message(dialogue.user_input, ignore_unknown_media=True)

                async def chat_wrapper():
                    async for chunk, agent_conv_id in multi_agents.quick_app_chat(
                        conv_session_id=dialogue.conv_uid,
                        user_query=in_message,
                        model=dialogue.model_name,
                        model_tokens=dialogue.max_new_tokens,
                        temperature=dialogue.temperature,
                        chat_in_params=dialogue.chat_in_params,
                        app_code=dialogue.app_code,
                        **dialogue.ext_info,
                    ):
                        yield chunk
                return StreamingResponse(
                    chat_wrapper(),
                    headers=headers,
                    media_type="text/event-stream",
                )
        else:

            dialogue.ext_info.update({"model_name": dialogue.model_name})
            dialogue.ext_info.update({"incremental": dialogue.incremental})
            dialogue.ext_info.update({"temperature": dialogue.temperature})
            dialogue.ext_info.update({"max_new_tokens": dialogue.max_new_tokens})

            in_message = HumanMessage.parse_chat_completion_message(dialogue.user_input, ignore_unknown_media=True)
            async def chat_wrapper():
                async for chunk, agent_conv_id in multi_agents.app_chat(
                    conv_uid=dialogue.conv_uid,
                    background_tasks=background_tasks,
                    gpts_name=dialogue.app_code,
                    specify_config_code=dialogue.app_config_code,
                    user_query=in_message,
                    user_code=dialogue.user_name,
                    sys_code=dialogue.sys_code,
                    chat_in_params=dialogue.chat_in_params,
                    **dialogue.ext_info,
                ):
                    yield chunk
            return StreamingResponse(
                chat_wrapper(),
                headers=headers,
                media_type="text/event-stream",
            )


    except Exception as e:
        logger.exception(f"Chat Exception!{dialogue}", e)

        async def error_text(err_msg):
            yield f"data:{err_msg}\n\n"

        return StreamingResponse(
            error_text(str(e)),
            headers=headers,
            media_type="text/plain",
        )
    finally:
        # write to recent usage app.
        if dialogue.user_name is not None and dialogue.app_code is not None:
            user_recent_app_dao.upsert(
                user_code=dialogue.user_name,
                sys_code=dialogue.sys_code,
                app_code=dialogue.app_code,
            )


@router.post("/v1/chat/topic/terminate")
async def terminate_topic(
        conv_id: str,
        round_index: int,
        user_token: UserRequest = Depends(get_user_from_headers),
):
    logger.info(f"terminate_topic:{conv_id},{round_index}")
    try:
        from opsdiag_serve.agent.agents.controller import multi_agents

        return Result.succ(await multi_agents.topic_terminate(conv_id))
    except Exception as e:
        logger.exception("Topic terminate error!")
        return Result.failed(code="E0102", msg=str(e))


@router.get("/v1/model/types")
async def model_types(controller: BaseModelController = Depends(get_model_controller)):
    logger.info("/controller/model/types")
    try:
        types = set()
        models = await controller.get_all_instances(healthy_only=True)
        for model in models:
            worker_name, worker_type = model.model_name.split("@")
            if worker_type == "llm" and worker_name not in [
                "codegpt_proxyllm",
                "text2sql_proxyllm",
            ]:
                types.add(worker_name)
        return Result.succ(list(types))

    except Exception as e:
        return Result.failed(code="E000X", msg=f"controller model types error {e}")


@router.get("/v1/test")
async def test():
    return "service status is UP"


@router.get(
    "/v1/model/supports",
    deprecated=True,
    description="This endpoint is deprecated. Please use "
                "`/api/v2/serve/model/model-types` instead. It will be removed in v0.8.0.",
)
async def model_supports(worker_manager: WorkerManager = Depends(get_worker_manager)):
    logger.warning(
        "The endpoint `/api/v1/model/supports` is deprecated. Please use "
        "`/api/v2/serve/model/model-types` instead. It will be removed in v0.8.0."
    )
    try:
        models = await worker_manager.supported_models()
        return Result.succ(FlatSupportedModel.from_supports(models))
    except Exception as e:
        return Result.failed(code="E000X", msg=f"Fetch supportd models error {e}")


async def flow_stream_generator(func, incremental: bool, model_name: str):
    stream_id = f"chatcmpl-{str(uuid.uuid1())}"
    previous_response = ""
    async for chunk in func:
        if chunk:
            msg = chunk.replace("\ufffd", "")
            if incremental:
                incremental_output = msg[len(previous_response):]
                choice_data = ChatCompletionResponseStreamChoice(
                    index=0,
                    delta=DeltaMessage(role="assistant", content=incremental_output),
                )
                chunk = ChatCompletionStreamResponse(
                    id=stream_id, choices=[choice_data], model=model_name
                )
                _content = json.dumps(
                    chunk.dict(exclude_unset=True), ensure_ascii=False
                )
                yield f"data: {_content}\n\n"
            else:
                # TODO generate an openai-compatible streaming responses
                msg = msg.replace("\n", "\\n")
                yield f"data:{msg}\n\n"
            previous_response = msg
    if incremental:
        yield "data: [DONE]\n\n"


async def no_stream_generator(chat):
    with root_tracer.start_span("no_stream_generator"):
        msg = await chat.nostream_call()
        yield f"data: {msg}\n\n"


async def stream_generator(
        chat,
        incremental: bool,
        model_name: str,
        text_output: bool = True,
        openai_format: bool = False,
        conv_uid: str = None,
):
    """Generate streaming responses

    Our goal is to generate an openai-compatible streaming responses.
    Currently, the incremental response is compatible, and the full response will be
    transformed in the future.

    Args:
        chat (BaseChat): Chat instance.
        incremental (bool): Used to control whether the content is returned
            incrementally or in full each time.
        model_name (str): The model name

    Yields:
        _type_: streaming responses
    """
    span = root_tracer.start_span("stream_generator")
    msg = "[LLM_ERROR]: llm server has no output, maybe your prompt template is wrong."

    stream_id = conv_uid or f"chatcmpl-{str(uuid.uuid1())}"
    try:
        if incremental and not openai_format:
            raise ValueError("Incremental response must be openai-compatible format.")
        async for chunk in chat.stream_call(
                text_output=text_output, incremental=incremental
        ):
            if not chunk:
                await asyncio.sleep(0.02)
                continue

            if openai_format:
                # Must be ModelOutput
                output: ModelOutput = cast(ModelOutput, chunk)
                text = None
                think_text = None
                if output.has_text:
                    text = output.text
                if output.has_thinking:
                    think_text = output.thinking_text
                if incremental:
                    choice_data = ChatCompletionResponseStreamChoice(
                        index=0,
                        delta=DeltaMessage(
                            role="assistant", content=text, reasoning_content=think_text
                        ),
                    )
                    chunk = ChatCompletionStreamResponse(
                        id=stream_id, choices=[choice_data], model=model_name
                    )
                    _content = json.dumps(
                        chunk.dict(exclude_unset=True), ensure_ascii=False
                    )
                    yield f"data: {_content}\n\n"
                else:
                    choice_data = ChatCompletionResponseChoice(
                        index=0,
                        message=ChatMessage(
                            role="assistant",
                            content=output.text,
                            reasoning_content=output.thinking_text,
                        ),
                    )
                    if output.usage:
                        usage = UsageInfo(**output.usage)
                    else:
                        usage = UsageInfo()
                    _content = ChatCompletionResponse(
                        id=stream_id,
                        choices=[choice_data],
                        model=model_name,
                        usage=usage,
                    )
                    _content = json.dumps(
                        chunk.dict(exclude_unset=True), ensure_ascii=False
                    )
                    yield f"data: {_content}\n\n"
            else:
                msg = chunk.replace("\ufffd", "")
                msg = msg.replace("\n", "\\n")
                yield f"data:{msg}\n\n"
            await asyncio.sleep(0.02)
        if incremental:
            yield "data: [DONE]\n\n"
        span.end()
    except Exception as e:
        logger.exception("stream_generator error")
        yield f"data: [SERVER_ERROR]{str(e)}\n\n"
        if incremental:
            yield "data: [DONE]\n\n"


def message2Vo(message: dict, order, model_name) -> MessageVo:
    return MessageVo(
        role=message["type"],
        context=message["data"]["content"],
        order=order,
        model_name=model_name,
    )
