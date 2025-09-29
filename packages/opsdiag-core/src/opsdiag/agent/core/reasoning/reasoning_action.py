import json
from typing import Optional, List

from pydantic import BaseModel, Field

from opsdiag.agent import (
    Action,
    AgentResource,
    ActionOutput,
    AgentMessage,
    ResourceType,
    Resource,
    ConversableAgent,
)
from opsdiag.agent.core.reasoning.reasoning_engine import REASONING_LOGGER as LOGGER
from opsdiag.agent.resource import ResourcePack
from opsdiag.util.tracer import root_tracer
from opsdiag.vis import SystemVisTag
from opsdiag_serve.agent.resource.knowledge_pack import KnowledgePackSearchResource
from opsdiag_serve.rag.api.schemas import KnowledgeSearchResponse


class AgentActionInput(BaseModel):
    """Plugin input model."""

    agent_name: str = Field(
        ...,
        description="Identifier of the destination agent",
    )
    content: str = Field(
        ...,
        description="Instructions or information sent to the agent.",
    )
    thought: str = Field(..., description="Summary of thoughts to the user")
    extra_info: dict = Field(
        None,
        description="Additional metadata or contextual data supporting the agent's action.",
    )


class AgentAction(Action[AgentActionInput]):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.action_view_tag = SystemVisTag.VisPlans.value

    async def run(
        self,
        ai_message: str = None,
        resource: Optional[AgentResource] = None,
        rely_action_out: Optional[ActionOutput] = None,
        need_vis_render: bool = True,
        **kwargs,
    ) -> ActionOutput:
        """Perform the action."""
        action_input = self.action_input or AgentActionInput.model_validate_json(
            json_data=ai_message
        )
        sender: ConversableAgent = kwargs["agent"]
        recipient = next(
            (agent for agent in sender.agents if agent.name == action_input.agent_name),
            None,
        )
        if not recipient:
            raise RuntimeError("recipient can't by empty")

        received_message = (
            kwargs["message"] if "message" in kwargs else AgentMessage.init_new()
        )
        # goal_id = uuid.uuid4().hex
        message = await sender.init_reply_message(received_message=received_message)
        message.rounds = await sender.memory.gpts_memory.next_message_rounds(
            sender.not_null_agent_context.conv_id
        )
        message.show_message = False
        message.user_prompt = received_message.user_prompt
        message.system_prompt = received_message.system_prompt
        message.content = (
            action_input.content
            + "\n\n"
            + json.dumps(action_input.extra_info, ensure_ascii=False)
        )
        # message.goal_id = kwargs["action_id"] if "action_id" in kwargs else ""
        # message.current_goal = action_input.content
        # 合并context 且action_input.extra_info优先级更高
        message.context = (message.context or {}) | (action_input.extra_info or {})

        # await sender.memory.gpts_memory.append_plans(conv_id=sender.agent_context.conv_id, plans=[GptsPlan(
        #     conv_id=sender.agent_context.conv_id,
        #     conv_round=message.rounds,
        #     task_parent=get_parent_action_id(action_id),
        #     task_uid=goal_id,
        #     sub_task_id=action_id,
        #     sub_task_num=message.rounds,
        #     sub_task_title="",
        #     sub_task_content=message.content,
        #     sub_task_agent=recipient.name,
        # )])

        LOGGER.info(
            f"[ACTION]---------->   Agent Action [{sender.name}] --> [{recipient.name}]"
        )
        ## 构建一个独立的对话消息轮次(不依赖对话循环)
        await sender.send(message=message, recipient=recipient, request_reply=False)

        answer: AgentMessage = await recipient.generate_reply(received_message=message, sender=sender, recipient=recipient)
        await recipient.send(message=answer, recipient=sender, request_reply=False)
        ask_user = True if answer and answer.action_report and answer.action_report.ask_user else False
        return ActionOutput.from_dict({
            "is_exe_success": True,
            "action": action_input.agent_name,
            "action_name": self.name,
            "action_input": action_input.content,
            "content": answer.message_id,
            "ask_user": ask_user,
        })


class KnowledgeRetrieveActionInput(BaseModel):
    query: str = Field(..., description="query to retrieve")
    knowledge_ids: Optional[List[str]] = Field(
        None, description="selected knowledge ids"
    )
    intention: Optional[str] = Field("", description="Summary of intention to the user")
    thought: Optional[str] = Field("", description="Summary of thoughts to the user")
    # space_ids: list[str] = Field(..., description="knowledge space id list")


class KnowledgeRetrieveAction(Action[KnowledgeRetrieveActionInput]):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.action_view_tag = SystemVisTag.VisPlans.value

    @property
    def resource_need(self) -> Optional[ResourceType]:
        return ResourceType.KnowledgePack

    def _inited_resource(self) -> Optional[KnowledgePackSearchResource]:
        def _unpack(resource: Resource) -> Optional[Resource]:
            if not resource:
                return None
            elif isinstance(resource, KnowledgePackSearchResource):
                return resource
            elif isinstance(resource, ResourcePack) and resource.sub_resources:
                return next(
                    (r2 for r1 in resource.sub_resources if (r2 := _unpack(r1))), None
                )
            else:
                return None

        return _unpack(self.resource)

    async def run(
        self,
        ai_message: str = None,
        rely_action_out: Optional[ActionOutput] = None,
        need_vis_render: bool = True,
        **kwargs,
    ) -> ActionOutput:
        """Perform the action."""
        agent: Optional[ConversableAgent] = kwargs.get("agent", None)
        with root_tracer.start_span(
            "agent.resource.knowledge_retrieve",
            metadata={
                "message_id": kwargs.get("message_id"),
                "rag_span_type": "knowledge_retrieve",
                "conv_id": agent.agent_context.conv_id if agent else None,
                "app_code": agent.agent_context.gpts_app_code if agent else None,
            },
        ) as span:
            resource = self._inited_resource()
            if not resource:
                raise RuntimeError("knowledge resource is empty or not init")
            output_dict = {
                "is_exe_success": True,
                "action": "知识检索",
                "action_name": self.name,
                "action_input": self.action_input.query,
            }
            try:
                summary_res = await resource.get_summary(
                    query=self.action_input.query,
                    selected_knowledge_ids=self.action_input.knowledge_ids,
                )
                summary: str = (
                    summary_res.summary_content
                    if summary_res
                       and isinstance(summary_res, KnowledgeSearchResponse)
                       and summary_res.summary_content
                    else "未找到相关知识"
                )
                output_dict["content"] = summary
                output_dict["view"] = summary
                output_dict["resource_value"] = (
                    summary_res.dict()
                    if isinstance(summary_res, KnowledgeSearchResponse)
                    else None
                )
                LOGGER.info(
                    f"[ACTION]---------->   "
                    f"KnowledgeRetrieveAction [{agent.name if agent else None}] --> action_output: {output_dict} "
                )
            except Exception as e:
                output_dict["is_exe_success"] = False
                output_dict["content"] = "知识检索失败"
                output_dict["view"] = "知识检索失败"
                LOGGER.exception(
                    f"[ACTION]---------->   "
                    f"KnowledgeRetrieveAction [{agent.name if agent else None}] --> exception: {repr(e)} "
                )
            action_output = ActionOutput.from_dict(output_dict)
            return action_output


class UserConfirmAction(Action[None]):
    async def run(
        self,
        ai_message: str = None,
        resource: Optional[AgentResource] = None,
        rely_action_out: Optional[ActionOutput] = None,
        need_vis_render: bool = True,
        **kwargs,
    ) -> ActionOutput:
        raise NotImplementedError


def get_parent_action_id(action_id: str) -> str:
    idx = action_id.rfind("-")
    return action_id[:idx] if idx > 0 else ""
