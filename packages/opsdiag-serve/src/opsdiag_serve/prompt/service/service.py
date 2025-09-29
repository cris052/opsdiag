import json
import logging
from typing import Dict, List, Optional, Type

from opsdiag.agent import ConversableAgent, get_agent_manager
from opsdiag.component import ComponentType, SystemApp
from opsdiag.core import ModelMetadata, ModelRequest, PromptTemplate
from opsdiag.core.interface.prompt import (
    SystemPromptTemplate,
    get_template_vars,
)
from opsdiag.model import DefaultLLMClient
from opsdiag.model.cluster import WorkerManagerFactory
from opsdiag.storage.metadata import BaseDao
from opsdiag.util.json_utils import compare_json_properties_ex, find_json_objects
from opsdiag.util.pagination_utils import PaginationResult
from opsdiag.util.tracer import root_tracer
from opsdiag_serve.core import BaseService

from ..api.schemas import PromptDebugInput, PromptType, ServeRequest, ServerResponse
from ..config import SERVE_SERVICE_COMPONENT_NAME, ServeConfig
from ..models.models import ServeDao, ServeEntity

logger = logging.getLogger(__name__)


class Service(BaseService[ServeEntity, ServeRequest, ServerResponse]):
    """The service class for Prompt"""

    name = SERVE_SERVICE_COMPONENT_NAME

    def __init__(
        self,
        system_app: SystemApp,
        config: ServeConfig,
        dao: Optional[ServeDao] = None,
    ):
        self._system_app = None
        self._serve_config: ServeConfig = config
        self._dao: ServeDao = dao
        super().__init__(system_app)

    def init_app(self, system_app: SystemApp) -> None:
        """Initialize the service

        Args:
            system_app (SystemApp): The system app
        """
        self._dao = self._dao or ServeDao(self._serve_config)
        self._system_app = system_app

    @property
    def dao(self) -> BaseDao[ServeEntity, ServeRequest, ServerResponse]:
        """Returns the internal DAO."""
        return self._dao

    @property
    def config(self) -> ServeConfig:
        """Returns the internal ServeConfig."""
        return self._serve_config

    def create(self, request: ServeRequest) -> ServerResponse:
        """Create a new Prompt entity

        Args:
            request (ServeRequest): The request

        Returns:
            ServerResponse: The response
        """

        if not request.user_name:
            request.user_name = self.config.default_user
        if not request.sys_code:
            request.sys_code = self.config.default_sys_code
        return super().create(request)

    def update(self, request: ServeRequest) -> ServerResponse:
        """Update a Prompt entity

        Args:
            request (ServeRequest): The request

        Returns:
            ServerResponse: The response
        """
        # Build the query request from the request
        query_request = {
            "prompt_code": request.prompt_code,
            "sys_code": request.sys_code,
        }
        return self.dao.update(query_request, update_request=request)

    def get(self, request: ServeRequest) -> Optional[ServerResponse]:
        """Get a Prompt entity

        Args:
            request (ServeRequest): The request

        Returns:
            ServerResponse: The response
        """
        # Build the query request from the request
        query_request = request
        return self.dao.get_one(query_request)

    def delete(self, request: ServeRequest) -> None:
        """Delete a Prompt entity

        Args:
            request (ServeRequest): The request
        """

        # TODO: implement your own logic here
        # Build the query request from the request
        query_request = {
            "prompt_name": request.prompt_name,
            "sys_code": request.sys_code,
        }
        self.dao.delete(query_request)

    def get_list(self, request: ServeRequest) -> List[ServerResponse]:
        """Get a list of Prompt entities

        Args:
            request (ServeRequest): The request

        Returns:
            List[ServerResponse]: The response
        """
        # TODO: implement your own logic here
        # Build the query request from the request
        query_request = request
        return self.dao.get_list(query_request)

    def get_list_by_page(
        self, request: ServeRequest, page: int, page_size: int
    ) -> PaginationResult[ServerResponse]:
        """Get a list of Prompt entities by page

        Args:
            request (ServeRequest): The request
            page (int): The page number
            page_size (int): The page size

        Returns:
            List[ServerResponse]: The response
        """
        query_request = request
        return self.dao.get_list_page(
            query_request, page, page_size, ServeEntity.id.name
        )

    def get_prompt_template(self, prompt_type: str, target: Optional[str] = None):
        request = ServeRequest()
        request.prompt_type = prompt_type
        request.chat_scene = target

        return self.get_list(request)

    def get_target_prompt(
        self, target: Optional[str] = None, language: Optional[str] = None
    ):
        logger.info(f"get_target_prompt:{target}")
        request = ServeRequest()
        if target:
            request.chat_scene = target
        if language:
            request.prompt_language = language
        return self.get_list(request)

    def get_type_targets(self, prompt_type: str):
        type = PromptType(prompt_type)
        if type == PromptType.AGENT:
            agent_manage = get_agent_manager()
            return agent_manage.list_agents()

        elif type == PromptType.SCENE:
            from opsdiag_app.scene import ChatScene

            return [
                {"name": item.value(), "desc": item.describe()} for item in ChatScene
            ]
        elif type == PromptType.EVALUATE:
            from opsdiag.rag.evaluation.answer import LLMEvaluationMetric

            return [
                {"name": item.name, "desc": item.prompt_template}
                for item in LLMEvaluationMetric.__subclasses__()
            ]
        else:
            return None

    def get_template(self, prompt_code: str) -> Optional[PromptTemplate]:
        if not prompt_code:
            return None
        query_request = ServeRequest(prompt_code=prompt_code)
        template = self.get(query_request)
        if not template:
            return None
        return PromptTemplate(
            template=template.content,
            template_scene=template.chat_scene,
            input_variables=get_template_vars(template.content),
            response_format=template.response_schema,
        )

    def load_template(
        self,
        prompt_type: str,
        target: Optional[str] = None,
        sub_target: Optional[str] = None,
        language: Optional[str] = "en",
    ):
        logger.info(f"load_template:{prompt_type},{target}")
        type = PromptType(prompt_type)
        if type == PromptType.AGENT:
            if not target:
                raise ValueError("请选择一个Agent用来加载模版")
            agent_manage = get_agent_manager()
            target_agent_cls: Type[ConversableAgent] = agent_manage.get_by_name(target)
            target_agent = target_agent_cls()
            base_template, format_type = target_agent.prompt_template(prompt_type=sub_target,  language=language)

            return PromptTemplate(
                template=base_template,
                input_variables=get_template_vars(base_template, template_format=format_type),
                response_format=target_agent.actions[0].ai_out_schema_json if target_agent.actions else None,
            )
        elif type == PromptType.SCENE:
            if not target:
                raise ValueError("请选择一个场景用来加载模版")
            from opsdiag._private.config import Config

            cfg = Config()
            from opsdiag_app.scene import AppScenePromptTemplateAdapter

            try:
                app_prompt: AppScenePromptTemplateAdapter = (
                    cfg.prompt_template_registry.get_prompt_template(
                        target, cfg.LANGUAGE, None
                    )
                )
                for item in app_prompt.prompt.messages:
                    if isinstance(item, SystemPromptTemplate):
                        return item.prompt
                raise ValueError(f"当前场景没有找到可用的Prompt模版，{target}")
            except Exception:
                raise ValueError(f"当前场景没有找到可用的Prompt模版，{target}")
        elif type == PromptType.EVALUATE:
            if not target:
                raise ValueError("请选择一个场景用来加载模版")
            try:
                from opsdiag.rag.evaluation.answer import (
                    LLMEvaluationMetric,
                )

                prompts = [
                    item.prompt_template
                    for item in LLMEvaluationMetric.__subclasses__()
                    if target == item.name
                ]
                if len(prompts) == 0:
                    raise ValueError(f"当前场景没有找到可用的Prompt模版，{target}")
                prompt = prompts[0]
                return PromptTemplate(
                    template=prompt, input_variables=get_template_vars(prompt)
                )

            except Exception:
                raise ValueError(f"当前场景没有找到可用的Prompt模版，{target}")
        else:
            return None

    async def debug_prompt(self, debug_input: PromptDebugInput):
        logger.info(f"debug_prompt:{debug_input}")
        if not debug_input.user_input:
            raise ValueError("请输入你的提问!")
        try:
            worker_manager = self._system_app.get_component(
                ComponentType.WORKER_MANAGER_FACTORY, WorkerManagerFactory
            ).create()
            llm_client = DefaultLLMClient(worker_manager, auto_convert_message=True)
        except Exception as e:
            raise ValueError("LLM prepare failed!", e)

        try:
            debug_messages = []
            from opsdiag.core import ModelMessageRoleType

            prompt_vars = debug_input.input_values
            type = PromptType(debug_input.prompt_type)
            prompt_param = prompt_vars
            if type == PromptType.AGENT:
                ag_m = get_agent_manager()
                ag = ag_m.get(debug_input.chat_scene)

                all_variables = ag.init_variables()
                if all_variables:
                    for item in all_variables:
                        if prompt_vars and item.name not in prompt_vars:
                            prompt_param[item.name] = item.value

            elif type == PromptType.SCENE:
                if debug_input.response_schema:
                    prompt_param.update({"response": debug_input.response_schema})
            if debug_input.template_format == "f-string":
                system_prompt = debug_input.content.format(
                    **prompt_param,
                )
            else:
                from opsdiag.util.template_utils import render
                system_prompt = render(debug_input.content, prompt_param)

            debug_messages.append(
                {"role": ModelMessageRoleType.SYSTEM, "content": system_prompt}
            )
            debug_messages.append(
                {"role": ModelMessageRoleType.HUMAN, "content": debug_input.user_input}
            )
            metadata: ModelMetadata = await llm_client.get_model_metadata(
                debug_input.debug_model
            )
            payload = {
                "model": debug_input.debug_model,
                "messages": debug_messages,
                "temperature": debug_input.temperature,
                "max_new_tokens": metadata.context_length,
                "echo": metadata.ext_metadata.prompt_sep,
                "stop": None,
                "stop_token_ids": None,
                "context_len": None,
                "span_id": None,
                "context": None,
            }
            logger.info(f"Request: \n{payload}")
            span = root_tracer.start_span(
                "Agent.llm_client.no_streaming_call",
                metadata=self._get_span_metadata(payload),
            )
            payload["span_id"] = span.span_id

            # if params.get("context") is not None:
            #     payload["context"] = ModelRequestContext(extra=params["context"])

        except Exception as e:
            raise ValueError("参数准备失败！" + str(e))

        try:
            model_request = ModelRequest(**payload)

            async for output in llm_client.generate_stream(model_request.copy()):  # type: ignore
                res_content = output.gen_text_with_thinking()
                if res_content:
                    escaped_text = res_content.replace("\n", "\\n")
                    yield f"data: {escaped_text}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"Call LLMClient error, {str(e)}, detail: {payload}")
            raise ValueError(e)
        finally:
            span.end()

    def _get_span_metadata(self, payload: Dict) -> Dict:
        metadata = {k: v for k, v in payload.items()}

        metadata["messages"] = list(
            map(lambda m: m if isinstance(m, dict) else m.dict(), metadata["messages"])
        )
        return metadata

    def verify_response(
        self, llm_out: str, prompt_type: str, target: Optional[str] = None
    ):
        logger.info(f"verify_response:{llm_out},{prompt_type},{target}")
        type = PromptType(prompt_type)
        ai_json = find_json_objects(llm_out)
        if type == PromptType.AGENT:
            try:
                if not target:
                    raise ValueError("请选择一个Agent用来加载模版")
                from opsdiag.agent.core import agent_manage

                target_agent: ConversableAgent = agent_manage.get(
                    target
                )

                return compare_json_properties_ex(
                    ai_json, json.loads(target_agent.actions[0].ai_out_schema_json)
                )

            except Exception:
                raise ValueError(f"模型返回不符合[{target}]输出定义，请调整prompt！")

        elif type == PromptType.SCENE:
            if not target:
                raise ValueError("请选择一个场景用来加载模版")
            from opsdiag._private.config import Config

            cfg = Config()
            from opsdiag_app.scene import AppScenePromptTemplateAdapter

            try:
                app_prompt: AppScenePromptTemplateAdapter = (
                    cfg.prompt_template_registry.get_prompt_template(
                        target, cfg.LANGUAGE, None
                    )
                )

                sys_prompt = None
                for item in app_prompt.prompt.messages:
                    if isinstance(item, SystemPromptTemplate):
                        sys_prompt = item.prompt
                if sys_prompt:
                    return compare_json_properties_ex(
                        ai_json, json.loads(sys_prompt.response_format)
                    )
            except Exception:
                raise ValueError(f"当前场景没有找到可用的Prompt模版，{target}")
        else:
            return True
