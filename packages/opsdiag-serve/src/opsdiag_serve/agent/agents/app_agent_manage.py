import json
import logging
import uuid
from abc import ABC
from typing import List, Type, Optional

from opsdiag._private.config import Config
from opsdiag.agent import (
    AgentContext,
    AgentMemory,
    AutoPlanChatManager,
    ConversableAgent,
    DefaultAWELLayoutManager,
    GptsMemory,
    LLMConfig,
    UserProxyAgent,
    get_agent_manager,
)
from opsdiag.agent.core.base_team import ManagerAgent
from opsdiag.agent.core.plan.react.team_react_plan import AutoTeamContext
from opsdiag.agent.resource import get_resource_manager
from opsdiag.agent.util.llm.llm import LLMStrategyType
from opsdiag.component import BaseComponent, ComponentType, SystemApp
from opsdiag.core import LLMClient, PromptTemplate
from opsdiag.model.cluster import WorkerManagerFactory
from opsdiag.model.cluster.client import DefaultLLMClient
from opsdiag_serve.core import blocking_func_to_async
from opsdiag_serve.prompt.api.endpoints import get_service

from ..db import GptsMessagesDao

from ..db.gpts_conversations_db import GptsConversationsDao
from ..team.base import TeamMode
from .derisks_memory import MetaDerisksMessageMemory, MetaDerisksPlansMemory
from opsdiag_serve.building.app.service.service import Service as AppService
from ...building.app.api.schema_app import GptsAppQuery, GptsApp, GptsAppDetail

CFG = Config()
logger = logging.getLogger(__name__)


class AppManager(BaseComponent, ABC):
    name = "derisk_agent_app_manager"

    def __init__(self, system_app: SystemApp):
        self.gpts_conversations = GptsConversationsDao()
        self.gpts_messages_dao = GptsMessagesDao()

        self.memory = GptsMemory(
            plans_memory=MetaDerisksMessageMemory(),
            message_memory=MetaDerisksPlansMemory(),
        )
        self.agent_memory_map = {}

        super().__init__(system_app)
        self.system_app = system_app

    def init_app(self, system_app: SystemApp):
        self.system_app = system_app

    def get_derisks(self, query: Optional[str], user_code: Optional[str] = None, sys_code: Optional[str] = None):

        app_service = AppService.get_instance(CFG.SYSTEM_APP)

        apps = app_service.sync_app_list(GptsAppQuery(name_filter=query, user_code=user_code, sys_code=sys_code))
        if apps:
            ## 排除掉非Agent的无法进行链接对话应用，
            results = []
            for item in apps.app_list:
                if not item.team_mode == TeamMode.NATIVE_APP.value:
                    results.append(item)
            return results
        else:
            return []

    def get_app(self, app_code) -> GptsApp:
        """get app"""
        app_service = AppService.get_instance(CFG.SYSTEM_APP)
        return app_service.sync_app_detail(app_code)

    async def create_app_agent(
            self,
            gpts_app: GptsApp,
            agent_memory: AgentMemory,
            context: AgentContext,
    ) -> ConversableAgent:
        # init default llm provider
        llm_provider = DefaultLLMClient(
            self.system_app.get_component(
                ComponentType.WORKER_MANAGER_FACTORY, WorkerManagerFactory
            ).create(),
            auto_convert_message=True,
        )

        # init team employees
        # TODO employee has it own llm provider
        employees: List[ConversableAgent] = []
        for record in gpts_app.details:
            agent = await create_agent_from_gpt_detail(
                record, llm_provider, context, agent_memory
            )
            # agent.name_prefix = gpts_app.app_name
            employees.append(agent)

        app_agent: ConversableAgent = await create_agent_of_gpts_app(
            gpts_app, llm_provider, context, agent_memory, employees
        )
        # app_agent.name_prefix = gpts_app.app_name
        return app_agent

    async def create_agent_by_app_code(
            self,
            gpts_app: GptsApp,
            conv_uid: str = None,
            agent_memory: AgentMemory = None,
            context: AgentContext = None,
    ) -> ConversableAgent:
        """
        Create a conversable agent by application code.

        Parameters:
            gpts_app (str): The application.
            conv_uid (str, optional): The unique identifier of the conversation,
                default is None. If not provided, a new UUID will be generated.
            agent_memory (AgentMemory, optional): The memory object for the agent,
                default is None. If not provided, a default memory object will be
                created.
            context (AgentContext, optional): The context object for the agent, default
                is None. If not provided, a default context object will be created.

        Returns:
            ConversableAgent: The created conversable agent object.
        """
        conv_uid = str(uuid.uuid4()) if conv_uid is None else conv_uid

        from opsdiag.agent.core.memory.gpts import (
            DefaultGptsMessageMemory,
            DefaultGptsPlansMemory,
        )

        if agent_memory is None:
            gpt_memory = GptsMemory(
                plans_memory=DefaultGptsPlansMemory(),
                message_memory=DefaultGptsMessageMemory(),
            )
            gpt_memory.init(conv_uid)
            agent_memory = AgentMemory(gpts_memory=gpt_memory)

        if context is None:
            context: AgentContext = AgentContext(
                conv_id=conv_uid,
                gpts_app_code=gpts_app.app_code,
                gpts_app_name=gpts_app.app_name,
                language=gpts_app.language,
                enable_vis_message=False,
            )
        context.gpts_app_code = gpts_app.app_code
        context.gpts_app_name = gpts_app.app_name
        context.language = gpts_app.language

        agent: ConversableAgent = await self.create_app_agent(
            gpts_app, agent_memory, context
        )
        return agent


async def create_agent_from_gpt_detail(
        record: GptsAppDetail,
        llm_client: LLMClient,
        agent_context: AgentContext,
        agent_memory: AgentMemory,
) -> ConversableAgent:
    """
    Get the agent object from the GPTsAppDetail object.
    """
    agent_manager = get_agent_manager()
    agent_cls: Type[ConversableAgent] = agent_manager.get_by_name(record.agent_name)
    llm_config = LLMConfig(
        llm_client=llm_client,
        llm_strategy=LLMStrategyType(record.llm_strategy),
        strategy_context=record.llm_strategy_value,
    )
    prompt_template = None
    if record.prompt_template:
        prompt_template: PromptTemplate = get_service().get_template(
            prompt_code=record.prompt_template
        )

    depend_resource = await blocking_func_to_async(
        CFG.SYSTEM_APP, get_resource_manager().build_resource, record.resources
    )

    agent = (
        await agent_cls()
        .bind(agent_context)
        .bind(agent_memory)
        .bind(llm_config)
        .bind(depend_resource)
        .bind(prompt_template)
        .build()
    )

    return agent


async def create_agent_of_gpts_app(
        gpts_app: GptsApp,
        llm_client: LLMClient,
        context: AgentContext,
        memory: AgentMemory,
        employees: List[ConversableAgent],
) -> ConversableAgent:
    llm_config = LLMConfig(
        llm_client=llm_client,
        llm_strategy=LLMStrategyType.Default,
    )

    team_context = gpts_app.team_context

    team_mode = TeamMode(gpts_app.team_mode)
    if team_mode == TeamMode.SINGLE_AGENT:
        agent_of_app: ConversableAgent = employees[0]
    else:
        if TeamMode.AUTO_PLAN == team_mode:
            if gpts_app.team_context:
                agent_manager = get_agent_manager()
                auto_team_ctx = AutoTeamContext(**json.loads(gpts_app.team_context))
                manager_cls: Type[ManagerAgent] = agent_manager.get_teamleader_by_name(
                    auto_team_ctx.teamleader
                )
                manager = manager_cls()
            else:
                ## default
                manager = AutoPlanChatManager()

            if not gpts_app.details or len(gpts_app.details) < 0:
                raise ValueError("APP exception no available agent！")
            llm_config = employees[0].llm_config

        elif TeamMode.AWEL_LAYOUT == team_mode:
            if not team_context:
                raise ValueError(
                    "Your APP has not been developed yet, please bind Flow!"
                )
            manager = DefaultAWELLayoutManager(dag=team_context)
        elif TeamMode.NATIVE_APP == team_mode:
            raise ValueError("Native APP chat not supported!")
        else:
            raise ValueError(f"Unknown Agent Team Mode!{team_mode}")
        manager = await manager.bind(context).bind(memory).bind(llm_config).build()
        manager.hire(employees)
        agent_of_app: ConversableAgent = manager

    return agent_of_app


def get_app_manager() -> AppManager:
    return app_manager


app_manager = AppManager(CFG.SYSTEM_APP)
