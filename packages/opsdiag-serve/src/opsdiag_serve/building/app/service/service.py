import json
import logging
import uuid
from copy import deepcopy
from datetime import datetime
from typing import List, Optional
from sqlalchemy import or_

from opsdiag._private.config import Config
from opsdiag.agent import get_agent_manager, AgentResource, AWELTeamContext, ResourceType
from opsdiag.agent.core.plan.base import SingleAgentContext
from opsdiag.agent.core.plan.react.team_react_plan import AutoTeamContext
from opsdiag.component import SystemApp
from opsdiag.storage.metadata import BaseDao
from opsdiag.util.pagination_utils import PaginationResult
from opsdiag.vis.schema import ChatLayout
from opsdiag.vis.vis_manage import get_vis_manager
from opsdiag_serve.agent.model import NativeTeamContext
from opsdiag_serve.agent.team.base import TeamMode
from opsdiag_serve.core import BaseService
from ..api.schema_app import GptsAppDetail, GptsAppQuery, GptsAppResponse
from ..api.schema_app_detail import AppDetailServeRequest, AppDetailServerResponse

from ..api.schemas import ServeRequest, ServerResponse
from ..config import SERVE_SERVICE_COMPONENT_NAME, ServeConfig
from ..models.models import ServeDao, ServeEntity
from ..models.models_details import AppDetailServeDao, AppDetailServeEntity
from ...config.service.service import Service as AppConfigService, TEMP_VERSION_SUFFIX
from ...config.api.schemas import ServeRequest as AppConfigRequest, LLMResource, Layout
from ...config.config import SERVE_SERVICE_COMPONENT_NAME as Config_SERVE_SERVICE_COMPONENT
from ...recommend_question.models.models import ServeEntity as RecommendQuestionEntity
from ...recommend_question.models.models import ServeDao as RecommendQuestionDao
from ...recommend_question.api.schemas import ServeRequest as RecommendQuestionRequest
from ...recommend_question.api.schemas import ServerResponse as RecommendQuestionResponse

logger = logging.getLogger(__name__)
CFG = Config()

global_system_app: Optional[SystemApp] = None


def get_config_service() -> AppConfigService:
    """Get the service instance"""
    return CFG.SYSTEM_APP.get_component(Config_SERVE_SERVICE_COMPONENT, AppConfigService)


class Service(BaseService[ServeEntity, ServeRequest, ServerResponse]):
    """The service class for App"""

    name = SERVE_SERVICE_COMPONENT_NAME

    def __init__(
            self, system_app: SystemApp, config: ServeConfig, dao: Optional[ServeDao] = None
    ):
        self._system_app = None
        self._serve_config: ServeConfig = config
        self._dao: ServeDao = dao
        self._detail_dao: AppDetailServeDao = AppDetailServeDao()
        self._recommend_question_dao: RecommendQuestionDao = RecommendQuestionDao(config)
        super().__init__(system_app)

    def init_app(self, system_app: SystemApp) -> None:
        """Initialize the service

        Args:
            system_app (SystemApp): The system app
        """
        super().init_app(system_app)
        self._dao = self._dao or ServeDao(self._serve_config)
        self._system_app = system_app
    async def async_after_start(self):
        """After initialize the service

        Args:
            system_app (SystemApp): The system app
        """
        await self.looad_define_app()

    @property
    def dao(self) -> BaseDao[ServeEntity, ServeRequest, ServerResponse]:
        """Returns the internal DAO."""
        return self._dao

    @property
    def detail_app_dao(self) -> BaseDao[AppDetailServeEntity, AppDetailServeRequest, AppDetailServerResponse]:
        """Returns the internal DAO."""
        return self._detail_dao

    @property
    def recommend_question_dao(self) -> BaseDao[
        RecommendQuestionEntity, RecommendQuestionRequest, RecommendQuestionResponse]:
        """Returns the internal DAO."""
        return self._recommend_question_dao

    @property
    def config(self) -> ServeConfig:
        """Returns the internal ServeConfig."""
        return self._serve_config


    async def new_define_app(self, request: ServeRequest):
        logger.info("new_define_app")
        self.create(request)

        new_app = await self.edit(request)
        await self.publish(request.app_code, new_app.config_code, carefully_chosen=request.published)

    def create(self, request: ServeRequest) -> Optional[ServerResponse]:
        """应用构建."""
        logger.info(f"app create:{request.app_name},{request.team_mode}")
        # if not request.app_code:
        #     request.app_code = uuid.uuid1().hex
        if not request.team_mode:
            if request.details and len(request.details) > 0:
                request.team_mode = TeamMode.AUTO_PLAN.value
            else:
                request.team_mode = TeamMode.SINGLE_AGENT.value

        # 初始化布局
        if not request.layout:
            from opsdiag_ext.vis.derisk.derisk_vis_incr_converter import DeriskVisIncrConverter
            defualt_convert = DeriskVisIncrConverter()
            request.layout = Layout(chat_layout=ChatLayout(name=defualt_convert.render_name,incremental=defualt_convert.incremental, description=defualt_convert.description))
        # 初始化模型策略
        if not request.llm_config:
            from opsdiag.agent import LLMStrategyType
            request.llm_config = LLMResource(llm_strategy=LLMStrategyType.Default.value)

        # 冲突检测
        chek_app = self.get(request)
        if chek_app:
            raise ValueError("应用名称或代码冲突！")
        res = self.dao.create(request)
        return res

    def app_info_to_config(self, request: ServeRequest) -> AppConfigRequest:

        ## TODO AWEL模式的自动判断 按需定制
        if not request.team_mode == TeamMode.NATIVE_APP.value:
            if request.agent:
                ag_mg = get_agent_manager()
                ag = ag_mg.get(request.agent)
                if ag.is_team:
                    request.team_mode = TeamMode.AUTO_PLAN.value
                    if not request.team_context:
                        team_context = AutoTeamContext(teamleader=request.agent)
                    else:
                        team_context = AutoTeamContext(**request.team_context.to_dict())
                        team_context.teamleader = request.agent
                else:
                    request.team_mode = TeamMode.SINGLE_AGENT.value
                    if not request.team_context:
                        team_context = SingleAgentContext(agent_name=request.agent)
                    else:
                        team_context = SingleAgentContext(**request.team_context.to_dict())
                        team_context.agent_name = request.agent
            else:
                request.team_mode = TeamMode.SINGLE_AGENT.value
                team_context = SingleAgentContext(**request.team_context.to_dict())
        else:
            team_context = request.team_context

        return AppConfigRequest(
            app_code=request.app_code,
            team_mode=request.team_mode,
            team_context=team_context,
            resources=request.resources,
            ext_config=request.ext_config,
            gmt_last_edit=request.updated_at,
            editor=request.editor,
            creator=request.creator,
            layout=request.layout,
            custom_variables=request.custom_variables,
            llm_config=request.llm_config,
            resource_knowledge=request.resource_knowledge,
            resource_tool=request.resource_tool,
            resource_agent=request.resource_agent,
            system_prompt_template=request.system_prompt_template,
            user_prompt_template=request.user_prompt_template,
        )

    async def edit(self, request: ServeRequest) -> Optional[ServerResponse]:
        logger.info(f"app edit:{request}")
        query_dict = {
            "app_code": request.app_code
        }
        app_resp = self.dao.get_one(query_dict)
        ## 编辑应用基础信息(如果有修改)
        update_dict = {}
        if request.app_name and request.app_name != app_resp.app_name:
            update_dict['app_name'] = request.app_name
        if request.app_describe and request.app_describe != app_resp.app_describe:
            update_dict['app_describe'] = request.app_describe
        if request.icon and request.icon != app_resp.icon:
            update_dict['icon'] = request.icon
        if request.language and request.language != app_resp.language:
            update_dict['language'] = request.language

        if len(update_dict) > 0:
            self.dao.update(query_dict, update_dict)
        ## 编辑应用配置
        ### 应用基础信息转配置信息

        app_config_service = get_config_service()

        temp_config = await app_config_service.edit(self.app_info_to_config(request))
        config_code = app_resp.config_code
        if temp_config:
            request.config_code = temp_config.code
            request.config_version = temp_config.version_info
            config_code = temp_config.code
        return await self.app_detail(app_code=request.app_code, specify_config_code=config_code)

    async def publish(self, app_code: str, new_config_code: str, operator: Optional[str] = None, carefully_chosen: bool = False,
                      description: Optional[str] = None) -> Optional[ServerResponse]:
        """应用构建配置发布."""
        logger.info(f"app publish:{app_code},{new_config_code},{operator}")
        with self.dao.session(commit=False) as session:

            ### 应用发布需要在同一个事务里做两件事情:
            ### 1.修改当前临时版本配置未正式配置代码，状态修改为发布
            ### 2.修改应用的配置代码未当前发布版本
            ### 3.提交事务
            from opsdiag_serve.building.config.models.models import ServeEntity as AppConfigEntity
            config_service = get_config_service()

            app_query_object = {"app_code": app_code}
            query = self.dao._create_query_object(session, app_query_object)
            app_entry: ServeEntity = query.first()
            if app_entry:
                app_config_query = session.query(AppConfigEntity)
                app_config_query = app_config_query.filter(AppConfigEntity.app_code == app_entry.app_code).filter(
                    AppConfigEntity.code == new_config_code)
                app_config_entry: AppConfigEntity = app_config_query.first()
                if not app_config_entry:
                    raise ValueError(f"配置[{app_config_entry.code}]已经不存在")

                # 配置发布,状态和版本信息更新
                release_config_version = config_service.temp_to_formal(app_config_entry.version_info)
                now = datetime.now()
                app_config_entry.version_info = release_config_version
                app_config_entry.is_published = 1
                app_config_entry.operator = operator
                app_config_entry.description = description

                # 应用配置代码更新
                app_entry.config_code = new_config_code
                app_entry.config_version = release_config_version
                app_entry.published = carefully_chosen
                app_entry.updated_at = now

                session.merge(app_config_entry)
                session.merge(app_entry)
                session.commit()

            else:
                raise ValueError(f"发布失败，未找到对应的应用信息[{app_code}]")
        return await self.app_detail(app_code=app_code)

    def get_apps_by_codes(self, app_codes: List[str]):
        session = self.dao.get_raw_session()
        apps_query = session.query(ServeEntity)
        apps_query = apps_query.filter(ServeEntity.app_code.in_(app_codes))
        result = apps_query.all()
        session.close()
        return result

    def sync_app_list(self, query: GptsAppQuery, parse_llm_strategy: bool = False):
        session = self.dao.get_raw_session()
        try:
            app_qry = session.query(ServeEntity)
            if query.name_filter:
                app_qry = app_qry.filter(
                    ServeEntity.app_name.like(f"%{query.name_filter}%")
                )
            if not (query.ignore_user and query.ignore_user.lower() == "true"):
                if query.user_code:
                    app_qry = app_qry.filter(
                        or_(
                            ServeEntity.user_code == query.user_code,
                            ServeEntity.admins.like(f"%{query.user_code}%"),
                        )
                    )
                if query.sys_code:
                    app_qry = app_qry.filter(ServeEntity.sys_code == query.sys_code)
            if query.team_mode:
                app_qry = app_qry.filter(ServeEntity.team_mode == query.team_mode)
            # if query.is_collected and query.is_collected.lower() in ("true", "false"):
            #     app_qry = app_qry.filter(ServeEntity.app_code.in_(app_codes))
            # if query.is_recent_used and query.is_recent_used.lower() == "true":
            #     app_qry = app_qry.filter(ServeEntity.app_code.in_(recent_app_codes))
            if query.published and str(query.published ).lower() in ("true", "false"):
                app_qry = app_qry.filter(
                    ServeEntity.published == query.published
                )
            if query.app_codes:
                app_qry = app_qry.filter(ServeEntity.app_code.in_(query.app_codes))
            total_count = app_qry.count()
            app_qry = app_qry.order_by(ServeEntity.id.desc())
            app_qry = app_qry.offset((query.page - 1) * query.page_size).limit(
                query.page_size
            )

            results = app_qry.all()
        finally:
            session.close()

        if results is not None:
            # result_app_codes = [res.app_code for res in results]
            # app_details_group = self._group_app_details(result_app_codes, session)
            # app_question_group = self._group_app_questions(result_app_codes, session)
            apps: List = []

            for app_entity in results:
                app_info = self.dao.to_response(app_entity)
                apps.append(app_info)
            app_resp = GptsAppResponse()

            # apps = sorted(
            #     apps,
            #     key=lambda obj: (
            #         float("-inf") if obj.hot_value is None else obj.hot_value
            #     ),
            #     reverse=True,
            # )
            app_resp.total_count = total_count
            app_resp.app_list = apps
            app_resp.current_page = query.page
            app_resp.page_size = query.page_size
            app_resp.total_page = (total_count + query.page_size - 1) // query.page_size
            return app_resp

    async def app_list(self, query: GptsAppQuery, parse_llm_strategy: bool = False):
        return self.sync_app_list(query, parse_llm_strategy)

    def _app_resp_replenish(self,
                            app_info: ServerResponse,
                            parse_llm_strategy: bool = False,
                            owner_avatar_url: Optional[str] = None,
                            ):
        ## 处理关联APP
        app_info = self.app_detail_to_resource(app_info)

        app_info.owner_avatar_url = owner_avatar_url

        ## 处理关联的推荐问题
        app_recommend_questions = self.recommend_question_dao.get_list({"app_code": app_info.app_code})
        if app_recommend_questions:
            app_info.recommend_questions = app_recommend_questions
        return app_info

    def app_to_details(self, main_app_code: str, main_app_name: str, app_codes: List[str]):
        result: List = []
        detail_apps = self.get_apps_by_codes(app_codes)
        for item in detail_apps:
            result.append(GptsAppDetail(
                app_code=main_app_code,
                app_name=main_app_name,
                type="app",
                agent_name=item.app_name,
                agent_role=item.app_code,
                agent_describe=item.app_describe,
                agent_icon=item.icon,
                created_at=item.created_at,
                updated_at=item.updated_at,
            ))
        return result

    def _pop_resource(self, resources: List[AgentResource], filter_types: List[str]):
        new_lst = []
        result_resources = []
        for item in resources:
            if not item.type in filter_types:
                new_lst.append(item)
            else:
                result_resources.append(item)
        resources[:] = new_lst  # 原地修改原列表
        return result_resources
    def _resource_to_app_detail(self, app_info: ServerResponse, agent_resources: List[AgentResource]):
        details = []
        for item in agent_resources:
            # {\"name\":\"My Agent Resource\",\"app_code\":\"1bc6d188-735e-11f0-b924-00163e0ea545\"}
            app_code = None,
            if isinstance(item.value, str):
                value_dict = json.loads(item.value)
                app_code = value_dict.get("app_code")
            elif isinstance(item.value, dict):
                app_code = item.value.get("app_code")
            else:
                logger.warning("不支持的AgentAppResource内容1！")
            if not app_code:
                logger.warning(f"AgentAppResource{item.value}没有找到AppCode！")
                continue
            item_info = self.get(ServeRequest(app_code=app_code))
            details.append(GptsAppDetail(
                app_code=app_info.app_code,
                app_name=app_info.app_name,
                type=item.type,
                agent_name=item_info.app_name,
                agent_role=item_info.app_code,
                agent_icon=item_info.icon,
                agent_describe=item_info.app_describe,
                node_id=uuid.uuid4().hex,
                resources=None,
                prompt_template=None,
                llm_strategy=None,
                llm_strategy_value=None,
                created_at=item_info.created_at,
                updated_at=item_info.updated_at,
            ))

        app_info.details = details
        app_info.resource_agent = agent_resources
        return app_info

    def sync_app_detail(self, app_code: str, specify_config_code: Optional[str] = None, building_mode: bool = True) -> Optional[ServerResponse]:
        logger.info(f"get_app_detail:{app_code},{specify_config_code}")
        app_resp = self.dao.get_one({"app_code": app_code})
        if not app_resp:
            raise ValueError(f'应用不存在[{app_code}]')
        ## 如果是构建模式，默认加载当前临时配置，如果没有临时配置才加载应用的发布配置
        config_service = get_config_service()
        app_config = None
        if specify_config_code:
            logger.info(f"指定了配置代码，需要加载指定的配置")
            app_config = config_service.get_by_code(specify_config_code)
        else:
            if building_mode:
                temp_config = config_service.get_app_temp_code(app_code=app_code)
                if not temp_config:
                    logger.info("构建模式,优先加载当前的临时版本配置！")
                    ## 不存在临时配置 再看有没有真是配置
                    if app_resp.config_code:
                        app_config = config_service.get_by_code(app_resp.config_code)
                else:
                    app_config = temp_config
            else:
                logger.info("非构建模式,只能加载当前发布版本配置！")
                if app_resp.config_code:
                    app_config = config_service.get_by_code(app_resp.config_code)

        if app_config:
            all_resources = []
            logger.info(f"当前应用有配置代码，需要加载指定版本配置[{app_config.code}][{app_config.version_info}]！")

            if app_config.resource_agent:
                app_resp.resource_agent = app_config.resource_agent
                ## 如果配置存在resource_agent资源，转换为detail消费使用
                self._resource_to_app_detail(app_resp, app_config.resource_agent)

            app_resp.team_context = app_config.team_context
            app_resp.team_mode = app_config.team_mode
            # app_resp.language =
            app_resp.param_need = app_config.layout.chat_in_layout if app_config.layout else None
            app_resp.recommend_questions = app_config.recommend_questions

            app_resp.config_version = app_config.version_info
            app_resp.config_code = app_config.code

            app_resp.layout = app_config.layout
            app_resp.custom_variables = app_config.custom_variables

            app_resp.llm_config = app_config.llm_config

            ## 资源-知识
            if app_config.resource_knowledge:
                app_resp.resource_knowledge = app_config.resource_knowledge
                all_resources.extend(app_config.resource_knowledge)
            ## 资源-工具
            if app_config.resource_tool:
                app_resp.resource_tool = app_config.resource_tool
                all_resources.extend(app_config.resource_tool)
            ## 资源-agent app
            if app_config.resource_agent:
                app_resp.resource_agent = app_config.resource_agent
                all_resources.extend(app_config.resource_agent)


            ## 资源-其他扩展资源
            if app_config.resources:
                app_resp.resources = app_config.resources
                all_resources.extend(app_config.resources)

            if not building_mode:
                app_resp.all_resources = all_resources

            if isinstance(app_config.team_context, NativeTeamContext):
                app_resp.agent = app_config.team_context.agent_name
            elif isinstance(app_config.team_context, AWELTeamContext):
                app_resp.agent = "flow"  ## TODO
            elif isinstance(app_config.team_context, SingleAgentContext):
                app_resp.agent = app_config.team_context.agent_name
            else:
                if app_config.team_context:
                    app_resp.agent = app_config.team_context.teamleader

            ## 处理ReasoningAgent
            from opsdiag_ext.agent.agents.reasoning.default.reasoning_agent import ReasoningAgent
            reasoning_engine_resource: Optional[AgentResource] = None
            r_engine_system_prompt_t : Optional[str] = None
            r_engine_user_prompt_t : Optional[str] = None

            ag_mg = get_agent_manager()
            ag = ag_mg.get(app_resp.agent)
            
            # 检查agent是否存在，如果不存在则记录错误并返回空配置
            if ag is None:
                logger.error(f"Agent '{app_resp.agent}' 未在AgentManager中注册！请检查agent配置或注册状态")
                # 设置默认值避免后续错误
                app_resp.system_prompt_template = app_config.system_prompt_template or ""
                app_resp.user_prompt_template = app_config.user_prompt_template or ""
                app_resp.custom_variables = app_config.custom_variables or {}
                return app_resp
            
            if ag.is_reasoning_agent:
                app_resp.is_reasoning_engine_agent = True

                if app_config.resources:
                    for resource in app_config.resources:
                        if resource.type == ResourceType.ReasoningEngine.value:
                            reasoning_engine_resource= resource
                            break
                if reasoning_engine_resource:
                    reasoning_engine_value = {}
                    if isinstance(reasoning_engine_resource.value, str):
                        reasoning_engine_value = json.loads(reasoning_engine_resource.value)
                    elif isinstance(reasoning_engine_resource.value, dict):
                        reasoning_engine_value = reasoning_engine_resource.value
                    reasoning_engine_name = reasoning_engine_value.get("name") if reasoning_engine_value else None
                    if reasoning_engine_name:
                        from opsdiag.agent.core.reasoning.reasoning_engine import ReasoningEngine
                        reasoning_engine = ReasoningEngine.get_reasoning_engine(reasoning_engine_name)
                        r_engine_user_prompt_t = reasoning_engine.user_prompt_template
                        r_engine_system_prompt_t = reasoning_engine.system_prompt_template


            ## 处理prompt
            ### 如果配置里没有可用的prompt模版，进行初始化(ReasongAgent还需要继续根据配置的推理引擎进行初始化)
            if not app_config.system_prompt_template and building_mode:
                if app_resp.is_reasoning_engine_agent:
                    logger.info("构建模式初始化推理引擎system_prompt模版！")
                    if r_engine_system_prompt_t:
                        app_resp.system_prompt_template = r_engine_system_prompt_t
                else:
                    if not app_resp.team_mode == TeamMode.NATIVE_APP.value:
                        prompt_template, template_format = ag.prompt_template("system", app_resp.language)
                        app_resp.system_prompt_template = prompt_template
            else:
                app_resp.system_prompt_template = app_config.system_prompt_template

            if not app_config.user_prompt_template and building_mode:
                if app_resp.is_reasoning_engine_agent:
                    logger.info("构建模式初始化推理引擎user_prompt模版！")
                    if r_engine_user_prompt_t:
                        app_resp.user_prompt_template = r_engine_user_prompt_t
                else:
                    if not app_resp.team_mode == TeamMode.NATIVE_APP.value:
                        logger.info(f"初始化[{app_resp.agent}]user_prompt模版！")
                        prompt_template, template_format = ag.prompt_template("user", app_resp.language)
                        app_resp.user_prompt_template = prompt_template
            else:
                app_resp.user_prompt_template = app_config.user_prompt_template

            if not app_resp.team_mode == TeamMode.NATIVE_APP.value:
                if not app_config.custom_variables :
                    logger.info(f"构建模式初始化[{app_resp.agent}]的默认参数！")
                    app_resp.custom_variables = ag.init_variables()


            return app_resp
        else:
            logger.info(f"当前应用无配置代码，兼容旧数据模式！")
            return self.sync_old_app_detail(app_code, building_mode)



    def app_detail_to_resource(self, app_info: ServerResponse):
        ## 处理关联的App(agent)明细
        app_details = self.detail_app_dao.get_list({"app_code": app_info.app_code})
        agent_resources = []
        details = []
        if app_details and len(app_details) > 0:
            for item in app_details:
                if item.type == "app":
                    item_info = self.get(ServeRequest(app_code=item.agent_role))
                    if not item_info:
                        logger.warning(f"绑定应用[{item.agent_role}]已经不存在！")
                        continue
                    from opsdiag.agent.resource.app import AppInfo

                    agent_resources.append(AgentResource(
                        type=ResourceType.App.value,
                        value=json.dumps({
                            "name": f"{item_info.app_name}({item_info.app_code})",
                            "app_code": item_info.app_code,
                            "app_name":  item_info.app_name,
                            "app_describe":  item_info.app_describe,
                            "icon":  item_info.icon,
                        }, ensure_ascii=False),
                        name=f"{item_info.app_name}({item_info.app_code})",
                        unique_id = uuid.uuid4().hex
                    ))
                    details.append(GptsAppDetail(
                        app_code=app_info.app_code,
                        app_name=app_info.app_name,
                        type=item.type,
                        agent_name=item_info.app_name,
                        agent_role=item.agent_role,
                        agent_icon=item_info.icon,
                        agent_describe=item_info.app_describe,
                        node_id=item.node_id,
                        resources=None,
                        prompt_template=None,
                        llm_strategy=None,
                        llm_strategy_value=None,
                        created_at=item.created_at,
                        updated_at=item.updated_at,
                    ))
                else:
                    details.append(GptsAppDetail.from_dict(item.to_dict()))

        app_info.details = details
        app_info.resource_agent = agent_resources
        return app_info

    async def app_detail(self, app_code: str, specify_config_code: Optional[str] = None, building_mode: bool = True) -> Optional[ServerResponse]:
        return self.sync_app_detail(app_code, specify_config_code, building_mode)

    def sync_old_app_detail(self, app_code: str, building_mode:bool = True):
        app_resp = self.dao.get_one({"app_code": app_code})
        all_resources = []
        if app_resp.team_context:
            if "resources" in app_resp.team_context:
                all_resources = deepcopy(app_resp.team_context.resources)
                if building_mode:
                    app_resp.team_context.resources = None

            if app_resp.team_context.llm_strategy:
                app_resp.llm_config = LLMResource(
                    llm_strategy=app_resp.team_context.llm_strategy,
                    llm_strategy_value=app_resp.team_context.llm_strategy_value
                )
                if building_mode:
                    app_resp.team_context.llm_strategy = None
                    app_resp.team_context.llm_strategy_value = None

        from opsdiag.agent import ResourceType
        if not building_mode:
            app_resp.all_resources = deepcopy(all_resources)

        ## 兼容旧版ReasoningAgent的资源配置
        engine_resources = self._pop_resource(all_resources, [ResourceType.ReasoningEngine.value]) if all_resources else None
        try:
            if engine_resources:
                app_resp.is_reasoning_engine_agent = True
                ## 推理引擎资源取出去还要放回来
                all_resources.extend(engine_resources)
                reasoning_engine: AgentResource = engine_resources[0]
                reasoning_engine_value = json.loads(reasoning_engine.value)

                re_system_prompt_tempalte = reasoning_engine_value.get("system_prompt_template")
                if re_system_prompt_tempalte is not None:
                    app_resp.system_prompt_template = re_system_prompt_tempalte
                else:
                    app_resp.system_prompt_template = ""
                re_user_prompt_template = reasoning_engine_value.get("prompt_template")
                if re_user_prompt_template is not None:
                    app_resp.user_prompt_template = re_user_prompt_template
                else:
                    app_resp.user_prompt_template = ""
                # reasoning_arg_suppliers = reasoning_engine_value.get("reasoning_arg_suppliers")
                vis_mode = app_resp.team_context.vis_mode
                if vis_mode:
                    from opsdiag_serve.agent.nex.models.nex_model import ChatVisMap
                    from opsdiag_serve.agent.nex.models.nex_model import ChatTypeEnum
                    vis_map = ChatVisMap.of_nex_type(ChatTypeEnum(vis_mode))

                    vis_manager = get_vis_manager(CFG.SYSTEM_APP)
                    vis_convert = vis_manager.get_by_name(vis_map.vis_render)
                    if vis_convert:
                        app_resp.layout = Layout(
                            chat_layout=ChatLayout(name=vis_convert.render_name, description=vis_convert.description))
            else:
                if app_resp.team_context:
                    app_resp.system_prompt_template = app_resp.team_context.prompt_template
                    app_resp.user_prompt_template = app_resp.team_context.user_prompt_template
                    if building_mode:
                        app_resp.team_context.prompt_template = None
                        app_resp.team_context.user_prompt_template = None

            app_resp.resource_tool = self._pop_resource(all_resources,
                                                           [ResourceType.Tool.value, "tool(mcp(sse))", "tool(local)"])
            app_resp.resource_knowledge = self._pop_resource(all_resources, [ResourceType.Knowledge.value,
                                                                            ResourceType.KnowledgePack.value])
            ## 处理旧版Agent App关联为App资源
            app_resp.resource_agent = self._pop_resource(all_resources, [ResourceType.App.value])

            ## 处理旧版本的额外资源
            app_resp.resources = all_resources

            if not app_resp.layout:
                from opsdiag_ext.vis.derisk.derisk_vis_incr_converter import DeriskVisIncrConverter
                app_resp.layout = Layout(
                    chat_layout=ChatLayout(name=DeriskVisIncrConverter().render_name, description=DeriskVisIncrConverter().description ))

            if isinstance(app_resp.team_context, NativeTeamContext):
                app_resp.agent = app_code
            elif isinstance(app_resp.team_context, AWELTeamContext):
                app_resp.agent = "flow"  ## TODO
            elif isinstance(app_resp.team_context, SingleAgentContext):
                app_resp.agent = app_resp.team_context.agent_name
            else:
                if app_resp.team_context:
                    app_resp.agent = app_resp.team_context.teamleader

        except Exception as e:
            logger.warning(str(e), e)

        app_resp.config_code = None
        app_resp.config_version = f"{datetime.now().strftime('%Y%m%d%H%M%S')}{TEMP_VERSION_SUFFIX}"
        return self._app_resp_replenish(app_resp)

    async def looad_define_app(self):
        logger.info("加载本地定义的应用数据")
        # 1. 获取当前脚本所在目录
        import os
        current_dir = os.path.dirname(os.path.abspath(__file__))

        # 2. 构建目标文件夹路径（假设文件夹名为"json_data"）
        target_folder = os.path.join(current_dir, "derisk_app_define")

        # 3. 检查文件夹是否存在
        if not os.path.exists(target_folder):
            raise FileNotFoundError(f"应用定义目录不存在: {target_folder}")

        # 4. 获取所有JSON文件
        json_files = [f for f in os.listdir(target_folder)
                      if f.endswith('.json') and os.path.isfile(os.path.join(target_folder, f))]

        # 5. 加载并解析所有JSON文件
        for file in json_files:
            file_path = os.path.join(target_folder, file)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    json_data=json.load(f)
                    for item in json_data:
                        app_code = item.get("app_code")
                        app_name = item.get("app_name")
                        if app_code:
                            logger.info(f"更新应用[{app_name}:{app_code}]")
                            # 冲突检测
                            chek_app = self.get(ServeRequest(app_code=app_code,app_name=app_name))
                            if chek_app:
                                logger.info(f"应用[{app_code}-{app_name}]已经存在，无需再初始化！")
                                continue
                            await self.new_define_app(request=ServeRequest.from_dict(item))
                logger.info(f"应用成功加载: {file}")
            except Exception as e:
                logger.warning(f"应用加载失败 {file}: {str(e)}",e)



    def get(self, request: ServeRequest) -> Optional[ServerResponse]:
        """Get a App entity

        Args:
            request (ServeRequest): The request

        Returns:
            ServerResponse: The response
        """

        # Build the query request from the request
        query_request = {}
        if request.app_code:
            query_request["app_code"] = request.app_code
        if request.app_name:
            query_request["app_name"] = request.app_name

        return self.dao.get_one(query_request)


    def get_by_name(self, name: str) -> Optional[ServerResponse]:
        """Get a App entity

        Args:
            request (ServeRequest): The request

        Returns:
            ServerResponse: The response
        """

        # Build the query request from the request
        query_request = {
            "app_name": name,
        }

        return self.dao.get_one(query_request)

    async def delete_app(self, app_code: str):
        query_request = {
            "app_code": app_code
        }
        self.dao.delete(query_request)
    def delete(self, request: ServeRequest) -> None:
        """Delete a App entity

        Args:
            request (ServeRequest): The request
        """

        # Build the query request from the request
        query_request = {}
        if request.app_code:
            query_request["app_code"] = request.app_code
        if request.app_name:
            query_request["app_name"] = request.app_name

        self.dao.delete(query_request)

    def get_list(self, request: ServeRequest) -> List[ServerResponse]:
        """Get a list of App entities

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
        """Get a list of App entities by page

        Args:
            request (ServeRequest): The request
            page (int): The page number
            page_size (int): The page size

        Returns:
            List[ServerResponse]: The response
        """
        query_request = request
        return self.dao.get_list_page(query_request, page, page_size)


    async def list_hot_apps(self, query: GptsAppQuery):
        from opsdiag.storage.chat_history.chat_history_db import ChatHistoryDao

        chat_history_dao = ChatHistoryDao()
        hot_app_map = chat_history_dao.get_hot_app_map(query.page - 1, query.page_size)
        logger.info(f"hot_app_map = {hot_app_map}")
        hot_map = {}
        for hp in hot_app_map:
            hot_map[hp.get("app_code")] = hp.get("sz")
        app_codes = [hot_app.get("app_code") for hot_app in hot_app_map]
        if len(app_codes) == 0:
            return []
        apps = await self.app_list(
            GptsAppQuery(app_codes=app_codes, hot_map=hot_map, need_owner_info="true")
        )
        if apps:
            return apps.app_list
        return None

    def add_hub_code(self, app_code: str, app_hub_code: str):
        with self.dao.session() as session:
            app_qry = session.query(ServeEntity).filter(
                ServeEntity.app_code == app_code
            )
            entity = app_qry.one()
            entity.app_hub_code = app_hub_code
            session.merge(entity)
            session.commit()

    def get_hub_code(self, app_code: str) -> Optional[str]:
        app_res = self.get(ServeRequest(app_code=app_code))
        if app_res:
            return app_res.app_hub_code
        return None
