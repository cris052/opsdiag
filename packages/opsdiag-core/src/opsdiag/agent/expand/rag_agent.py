import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Type

from opsdiag._private.pydantic import Field
from .. import ResourceType, AgentMemoryFragment, StructuredAgentMemoryFragment
from ..core.agent import AgentReviewInfo
from ..core.base_agent import (
    ActionOutput,
    Agent,
    AgentMessage,
    ConversableAgent,
    ProfileConfig,
    Resource,
)
from opsdiag.agent.core.role import AgentRunMode
from opsdiag.agent.resource import BaseTool, ResourcePack, ToolPack, FunctionTool
from opsdiag.agent.util.react_parser import ReActOutputParser
from opsdiag.util.configure import DynConfig
from .actions.rag_action import AgenticRAGAction, AgenticRAGState

from .actions.react_action import Terminate
from ..core.memory.gpts import GptsPlan
from ..core.schema import Status
from ...util.json_utils import serialize
from ...util.tracer import root_tracer
from ...vis import Vis, SystemVisTag

logger = logging.getLogger(__name__)

_RAG_GOAL = """Answer the following questions or solve the tasks by \
selecting the right search tools. 
"""
_AGENTIC_RAG_SYSTEM_TEMPLATE = """
你是一个答疑智能助手。
## 目标
你的任务是根据用户的问题或任务，选择合适的知识库或者工具来回答问题或解决问题。
## 历史记忆
{{most_recent_memories}}

## 可用工具
可用知识和工具: {{resource_prompt}}

## 流程
1. 根据用户问题选择可用的知识或者工具。

## 回复格式
严格按以下JSON格式输出，确保可直接解析：
{
  "tools": [{
    "tool": "工具的名称,可以是知识检索工具或搜索工具。",
    "args": {
      "arg_name1": "arg_value1",
      "arg_name2": "arg_value2"
    }
  }],
  "knowledge": ["knowledge_id1", "knowledge_id2"],
  "intention": "本次的意图,一个简短的描述",
}

注意:如果<可用工具>中没有可用的知识或工具，请返回空的"tools"和"knowledge"字段。
## 用户问题
{{ question }}

当前时间是: {{ now_time }}。
"""

_AGENTIC_RAG_USER_TEMPLATE = """"""
_FINIAL_SUMMARY_TEMPLATE = """
您是一个总结专家,您的目标是根据找到的知识或历史对话记忆回答用户问题
## 已有知识和历史对话记忆
{{most_recent_memories}}
进行归纳总结，专业且有逻辑的回答用户问题。 
1.请用中文回答
2. 总结回答时请务必保留原文中的图片、引用、视频等链接内容
3. 原文中的图片、引用、视频等链接格式, 出现在原文内容中，内容后，段落中都可以认为属于原文内容，请确保在总结答案中依然输出这些内容，不要丢弃，不要修改.(参考图片链接格式：![image.png](xxx) 、普通链接格式:[xxx](xxx))
4.优先从给出的资源中总结用户问题答案，如果没有找到相关信息，则尝试从当前会话的历史对话记忆中找相关信息，忽略无关的信息.
5. 回答时总结内容需要结构良好的，中文字数不超过300字，尽可能涵盖上下文里面所有你认为有用的知识点，如果提供的资源信息带有和用户问题相关的图片![image.png](xxx) ，链接[xxx](xxx))或者表格,总结的时候也将图片，链接，表格按照markdown格式进行输出。
6. 注意需要并在每段总结的**中文**末尾结束标点符号前面注明内容来源的链接编号,语雀链接,语雀标题[i](https://yuque_url.com),i 为引用的序号，必须是数字，eg:1,2,3。
7. 输出图片时需要确认是否和用户当前问题相关，如果不相关则不输出图片链接。
8.如果没有找到工具和知识，请你直接回答用户问题。
9. 回答的时候内容按照论文的格式格式输出，组织结构尽量结构良好。
10.输出的时候每一个要点前面可以加图标，eg:✅🔍🧠📊🔗📎.

用户问题:
{{ question }}
"""

class RAGAgent(ConversableAgent):
    max_retry_count: int = 15
    run_mode: AgentRunMode = AgentRunMode.LOOP

    profile: ProfileConfig = ProfileConfig(
        name=DynConfig(
            "AgenticRAGAssistant",
            category="agent",
            key="derisk_agent_expand_rag_assistant_agent_name",
        ),
        role=DynConfig(
            "AgenticRAGAssistant",
            category="agent",
            key="derisk_agent_expand_rag_assistant_agent_role",
        ),
        goal=DynConfig(
            _RAG_GOAL,
            category="agent",
            key="derisk_agent_expand_plugin_assistant_agent_goal",
        ),
        system_prompt_template=_AGENTIC_RAG_SYSTEM_TEMPLATE,
        user_prompt_template=_FINIAL_SUMMARY_TEMPLATE,
    )
    parser: ReActOutputParser = Field(default_factory=ReActOutputParser)
    state: str = AgenticRAGState.REFLECTION.value
    next_step_prompt: str = profile.system_prompt_template
    refs: List[dict] = None

    def __init__(self, **kwargs):
        """Init indicator AssistantAgent."""
        super().__init__(**kwargs)
        self.state = AgenticRAGState.REFLECTION.value
        self._init_actions([AgenticRAGAction])

    def _check_and_add_terminate(self):
        if not self.resource:
            return
        _is_has_terminal = False

        def _has_terminal(r: Resource):
            nonlocal _is_has_terminal
            if r.type() == ResourceType.Tool and isinstance(r, Terminate):
                _is_has_terminal = True
            return r

        _has_add_terminal = False

        def _add_terminate(r: Resource):
            nonlocal _has_add_terminal
            if not _has_add_terminal and isinstance(r, ResourcePack):
                terminal = Terminate()
                r._resources[terminal.name] = terminal
                _has_add_terminal = True
            return r

        self.resource.apply(apply_func=_has_terminal)
        if not _is_has_terminal:
            # Add terminal action to the resource
            self.resource.apply(apply_pack_func=_add_terminate)

    async def generate_reply(
        self,
        received_message: AgentMessage,
        sender: Agent,
        reviewer: Optional[Agent] = None,
        rely_messages: Optional[List[AgentMessage]] = None,
        historical_dialogues: Optional[List[AgentMessage]] = None,
        is_retry_chat: bool = False,
        last_speaker_name: Optional[str] = None,
        **kwargs,
    ) -> AgentMessage:
        """Generate a reply based on the received messages."""
        logger.info(
            f"generate agent reply!sender={sender}, rely_messages_len={rely_messages}"
        )
        root_span = root_tracer.start_span(
            "agent.generate_reply",
            metadata={
                "sender": sender.name,
                "recipient": self.name,
                "reviewer": reviewer.name if reviewer else None,
                "received_message": json.dumps(received_message.to_dict(),default=serialize,),
                "conv_uid": self.not_null_agent_context.conv_id,
                "rely_messages": (
                    [msg.to_dict() for msg in rely_messages] if rely_messages else None
                ),
            },
        )
        reply_message = None

        try:
            self.received_message_state[received_message.message_id] = Status.RUNNING

            fail_reason = None
            self.current_retry_counter = 0
            is_success = True
            done = False
            observation = received_message.content or ""
            while not done and self.current_retry_counter < self.max_retry_count:
                if self.state == AgenticRAGState.FINAL_SUMMARIZE.value:
                    sender = self
                if self.current_retry_counter > 0:
                    retry_message = AgentMessage.init_new(
                        content=fail_reason or observation,
                        current_goal=received_message.current_goal,
                        rounds=reply_message.rounds + 1,
                    )

                    # The current message is a self-optimized message that needs to be
                    # recorded.
                    # It is temporarily set to be initiated by the originating end to
                    # facilitate the organization of historical memory context.
                    await sender.send(
                        retry_message, self, reviewer, request_reply=False
                    )
                    received_message.rounds = retry_message.rounds + 1

                with root_tracer.start_span(
                    "agent.generate_reply.init_reply_message",
                ) as span:
                    # initialize reply message
                    a_reply_message: Optional[
                        AgentMessage
                    ] = await self._a_init_reply_message(
                        received_message=received_message
                    )
                    if a_reply_message:
                        reply_message = a_reply_message
                    else:
                        reply_message = await self.init_reply_message(
                            received_message=received_message, sender=sender
                        )
                    span.metadata["reply_message"] = reply_message.to_dict()

                # In manual retry mode, load all messages of the last speaker as dependent messages # noqa
                logger.info(
                    f"Depends on the number of historical messages:{len(rely_messages) if rely_messages else 0}！"
                    # noqa
                )
                # if self.state == AgenticRAGState.FINAL_SUMMARIZE.value:
                #     self.profile.system_prompt_template = _FINIAL_SUMMARY_TEMPLATE
                # else:
                #     self.profile.system_prompt_template = _AGENTIC_RAG_SYSTEM_TEMPLATE
                (
                    thinking_messages,
                    resource_info,
                    system_prompt,
                    user_prompt,
                ) = await self._load_thinking_messages(
                    received_message=received_message,
                    sender=sender,
                    rely_messages=rely_messages,
                    historical_dialogues=historical_dialogues,
                    context=reply_message.get_dict_context(),
                    is_retry_chat=is_retry_chat,
                    force_use_historical=kwargs.get("force_use_historical"),
                )
                reply_message.system_prompt = system_prompt
                reply_message.user_prompt = user_prompt
                with root_tracer.start_span(
                    "agent.generate_reply.thinking",
                    metadata={
                        "thinking_messages": json.dumps(
                            [msg.to_dict() for msg in thinking_messages],
                            ensure_ascii=False,
                            default=serialize,
                        )
                    },
                ) as span:
                    # 1.Think about how to do things
                    llm_thinking, llm_content, model_name = await self.thinking(
                        thinking_messages, reply_message.message_id, sender, received_message=received_message
                    )

                    reply_message.model_name = model_name
                    reply_message.content = llm_content
                    reply_message.thinking = llm_thinking
                    reply_message.resource_info = resource_info
                    span.metadata["llm_reply"] = llm_content
                    span.metadata["model_name"] = model_name

                with root_tracer.start_span(
                    "agent.generate_reply.review",
                    metadata={"llm_reply": llm_content, "censored": self.name},
                ) as span:
                    # 2.Review whether what is being done is legal
                    approve, comments = await self.review(llm_content, self)
                    reply_message.review_info = AgentReviewInfo(
                        approve=approve,
                        comments=comments,
                    )
                    span.metadata["approve"] = approve
                    span.metadata["comments"] = comments

                act_extent_param = self.prepare_act_param(
                    received_message=received_message,
                    sender=sender,
                    rely_messages=rely_messages,
                    historical_dialogues=historical_dialogues,
                    reply_message=reply_message,
                )
                with root_tracer.start_span(
                    "agent.generate_reply.act",
                    metadata={
                        "llm_reply": llm_content,
                        "sender": sender.name,
                        "reviewer": reviewer.name if reviewer else None,
                        "act_extent_param": act_extent_param,
                    },
                ) as span:
                    # 3.Act based on the results of your thinking
                    act_out: ActionOutput = await self.act(
                        message=reply_message,
                        sender=sender,
                        reviewer=reviewer,
                        is_retry_chat=is_retry_chat,
                        last_speaker_name=last_speaker_name,
                        **act_extent_param,
                    )
                    if act_out:
                        reply_message.action_report = act_out
                        span.metadata["action_report"] = (
                            act_out.to_dict() if act_out else None
                        )

                with root_tracer.start_span(
                    "agent.generate_reply.verify",
                    metadata={
                        "llm_reply": llm_content,
                        "sender": sender.name,
                        "reviewer": reviewer.name if reviewer else None,
                    },
                ) as span:
                    # 4.Reply information verification
                    check_pass, reason = await self.verify(
                        reply_message, sender, reviewer
                    )
                    is_success = check_pass
                    span.metadata["check_pass"] = check_pass
                    span.metadata["reason"] = reason

                question: str = received_message.content or ""
                ai_message: str = llm_content
                # 5.Optimize wrong answers myself
                if not check_pass:
                    if not act_out.have_retry:
                        logger.warning("No retry available!")
                        break
                    fail_reason = reason
                    await self.write_memories(
                        question=question,
                        ai_message=ai_message,
                        action_output=act_out,
                        check_pass=check_pass,
                        check_fail_reason=fail_reason,
                        agent_id=self.not_null_agent_context.agent_app_code,
                        reply_message=reply_message,
                    )
                else:
                    # Successful reply
                    observation = act_out.observations
                    await self.write_memories(
                        question=question,
                        ai_message=ai_message,
                        action_output=act_out,
                        check_pass=check_pass,
                        agent_id=self.not_null_agent_context.agent_app_code,
                        reply_message=reply_message,
                    )
                    if self.run_mode != AgentRunMode.LOOP or act_out.terminate:
                        logger.debug(f"Agent {self.name} reply success!{reply_message}")
                        break

                # Continue to run the next round
                self.current_retry_counter += 1
                # Send error messages and issue new problem-solving instructions
                if self.state == AgenticRAGState.FINAL_SUMMARIZE.value:
                    sender = self
                if self.current_retry_counter < self.max_retry_count:
                    await self.send(
                        reply_message, sender, reviewer, request_reply=False
                    )

            reply_message.success = is_success
            # 6.final message adjustment
            await self.adjust_final_message(is_success, reply_message)

            ## 处理消息状态
            self.received_message_state.pop(received_message.message_id)
            return reply_message

        except Exception as e:
            logger.exception("Generate reply exception!")
            err_message = AgentMessage(content=str(e))
            err_message.rounds = 101
            err_message.success = False
            return err_message
        finally:
            if reply_message:
                root_span.metadata["reply_message"] = reply_message.to_dict()
            root_span.end()

    async def load_resource(self, question: str, is_retry_chat: bool = False):
        """Load agent bind resource."""
        prompt = ""
        tool_resources = ""
        if self.resource:
            tool_packs = ToolPack.from_resource(self.resource)
            action_space = {}
            if tool_packs:
                prompt = "<tools>\n"
                tool_pack = tool_packs[0]
                for tool in tool_pack.sub_resources:
                    if isinstance(tool, FunctionTool):
                        tool_simple_desc = tool.description
                        action_space[tool.name] = tool
                        parameters_string = await self._parse_tool_args(tool)
                        prompt += (f"<tool>\n"
                                   f"<tool_name>{tool.name}</tool_name>\n"
                                   f"<tool_desc>{tool_simple_desc}</tool_desc>\n"
                                   f"<parameters>{parameters_string}</parameters>\n"
                                   f"</tool>\n")
                    else:
                        tool_simple_desc = tool.get_prompt()
                        prompt += (f"<tool>\n"
                                   f"<tool_name>{tool.name}</tool_name>\n"
                                   f"<tool_desc>{tool_simple_desc}</tool_desc>\n"
                                   f"</tool>\n")

                prompt += "</tools>"
            tool_resources += prompt
            if isinstance(self.resource, ResourcePack):
                for resource in self.resource.sub_resources:
                    from opsdiag_serve.agent.resource.knowledge_pack import \
                        KnowledgePackSearchResource
                    if isinstance(resource, KnowledgePackSearchResource):
                        tool_resources += "\n<knowledge>\n"
                        tool_resources += resource.description
                        tool_resources += "</knowledge>\n"


        return tool_resources, []

    async def build_prompt(
            self,
            is_system: bool = True,
            most_recent_memories: Optional[str] = None,
            resource_vars: Optional[Dict] = None,
            is_retry_chat: bool = False,
            **kwargs,
    ) -> str:
        """Return the prompt template for the role.

        Returns:
            str: The prompt template.
        """
        if is_system:
            if self.state == AgenticRAGState.FINAL_SUMMARIZE.value:
                return ""
            if self.current_profile.get_system_prompt_template() == "":
                logger.info(f"RAG system prompt template is empty {self.profile.system_prompt_template}")
                self.current_profile.system_prompt_template = _AGENTIC_RAG_SYSTEM_TEMPLATE
            return self.current_profile.format_system_prompt(
                template_env=self.template_env,
                language=self.language,
                most_recent_memories=most_recent_memories or "",
                resource_vars=resource_vars,
                is_retry_chat=is_retry_chat,
                **kwargs,
            )
        else:
            if self.state == AgenticRAGState.REFLECTION.value:
                return ""
            if self.current_profile.get_user_prompt_template() == "":
                logger.info(f"RAG user prompt template is empty {self.profile.system_prompt_template}")
                self.current_profile.user_prompt_template = _FINIAL_SUMMARY_TEMPLATE
            return self.current_profile.format_user_prompt(
                template_env=self.template_env,
                language=self.language,
                most_recent_memories=most_recent_memories or "",
                resource_vars=resource_vars,
                **kwargs,
            )


    async def act(
        self,
        message: AgentMessage,
        sender: Agent,
        reviewer: Optional[Agent] = None,
        is_retry_chat: bool = False,
        last_speaker_name: Optional[str] = None,
        **kwargs,
    ) -> ActionOutput:
        """Perform actions."""
        logger.info("RAG Agent current state: %s", self.state)
        last_out: Optional[ActionOutput] = None
        for i, action in enumerate(self.actions):
            if not message:
                raise ValueError("The message content is empty!")

            with root_tracer.start_span(
                "agent.act.run",
                metadata={
                    "message": message,
                    "sender": sender.name if sender else None,
                    "recipient": self.name,
                    "reviewer": reviewer.name if reviewer else None,
                    "rely_action_out": last_out.to_dict() if last_out else None,
                    "conv_uid": self.not_null_agent_context.conv_id,
                    "action_index": i,
                    "total_action": len(self.actions),
                },
            ) as span:
                if self.state == AgenticRAGState.FINAL_SUMMARIZE.value:
                    logger.info(f"RAG AGENT run {self.profile.system_prompt_template}")
                last_out = await action.run(
                    ai_message=message.content if message.content else "",
                    resource=None,
                    rely_action_out=last_out,
                    state=self.state,
                    current_goal = message.current_goal,
                    message_id = message.message_id,
                    render_vis_fn=self._render_protocol(
                        vis_tag=SystemVisTag.VisTool.value
                    ),
                    **kwargs,
                )
                step_plans = []
                action_plan_map = {}
                plans: List[GptsPlan] = await self.memory.gpts_memory.get_plans(
                    self.not_null_agent_context.conv_id)
                plan_num = 1
                if plans and len(plans) > 0:
                    plan_num = plans[-1].conv_round
                conv_round_id = uuid.uuid4().hex
                task_uid = uuid.uuid4().hex
                step_plan: GptsPlan = GptsPlan(
                    conv_id=self.agent_context.conv_id,
                    conv_session_id=self.agent_context.conv_session_id,
                    conv_round=plan_num + 1,
                    conv_round_id=conv_round_id,
                    sub_task_id=task_uid,
                    sub_task_num=0,
                    task_uid=task_uid,
                    sub_task_content=f"{last_out.action}",
                    sub_task_title=f"{last_out.action}",
                    sub_task_agent="",
                    state=Status.COMPLETE.value,
                    action="",
                    task_round_title=f"{last_out.thoughts}",
                    task_round_description=f"{last_out.thoughts}",
                    planning_agent=self.name,
                    planning_model=message.model_name,
                )
                step_plans.append(step_plan)
                action_plan_map[action.action_uid] = step_plan
                await self.memory.gpts_memory.append_plans(
                    conv_id=self.agent_context.conv_id,
                    plans=[step_plan])
                self.state = last_out.state
                span.metadata["action_out"] = last_out.to_dict() if last_out else None
                if last_out.resource_value:
                    self.refs = [last_out.resource_value]
                if self.refs:
                    last_out.view += "\n" + await self._render_reference_view(
                        ref_resources=self.refs,
                        uid=message.message_id + "_ref",
                        message_id=message.message_id,
                    )
        if not last_out:
            raise ValueError("Action should return value！")
        return last_out

    async def write_memories(
        self,
        question: str,
        ai_message: str,
        action_output: Optional[ActionOutput] = None,
        check_pass: bool = True,
        check_fail_reason: Optional[str] = None,
        current_retry_counter: Optional[int] = None,
        reply_message: Optional[AgentMessage] = None,
        agent_id: Optional[str] = None,
    ) -> AgentMemoryFragment:
        """Write the memories to the memory.

        We suggest you to override this method to save the conversation to memory
        according to your needs.

        Args:
            question(str): The question received.
            ai_message(str): The AI message, LLM output.
            action_output(ActionOutput): The action output.
            check_pass(bool): Whether the check pass.
            check_fail_reason(str): The check fail reason.
            current_retry_counter(int): The current retry counter.
            reply_message(AgentMessage): The reply message.
            agent_id(str): The agent id.

        Returns:
            AgentMemoryFragment: The memory fragment created.
        """
        if not action_output:
            raise ValueError("Action output is required to save to memory.")

        mem_thoughts = action_output.thoughts or ai_message
        action = action_output.action
        action_input = action_output.action_input
        observation = check_fail_reason or action_output.observations

        memory_map = {
            "question": question,
            "thought": mem_thoughts,
            "action": action,
            "observation": observation,
        }
        if action_input:
            memory_map["action_input"] = action_input

        if current_retry_counter is not None and current_retry_counter == 0:
            memory_map["question"] = question

        write_memory_template = self.write_memory_template
        memory_content = self._render_template(write_memory_template, **memory_map)

        fragment_cls: Type[AgentMemoryFragment] = self.memory_fragment_class
        if issubclass(fragment_cls, StructuredAgentMemoryFragment):
            fragment = fragment_cls(memory_map)
        else:
            fragment = fragment_cls(
                observation=memory_content,
                agent_id=agent_id,
                memory_id=reply_message.message_id,
                role=self.name,
                rounds=reply_message.rounds,
                task_goal=question,
                thought="",
                action=action_output.action,
                action_result=action_output.observations,
            )
        await self.memory.write(fragment)

        action_output.memory_fragments = {
            "memory": fragment.raw_observation,
            "id": fragment.id,
            "importance": fragment.importance,
        }
        return fragment

    async def _parse_tool_args(self, tool: FunctionTool) -> str:
        """解析工具参数"""
        properties = {}
        required_list = []

        for key, value in tool.args.items():
            properties[key] = {
                "type": value.type,
                "description": value.description,
            }
            if value.required:
                required_list.append(key)

        parameters_dict = {
            "type": "object",
            "properties": properties,
            "required": required_list,
        }

        return json.dumps(parameters_dict, ensure_ascii=False)

    def _render_protocol(self, vis_tag: str) -> Vis:
        """
        Render the protocol for the given vis_tag.
        Args:
            vis_tag:

        Returns:

        """
        return self.memory.gpts_memory.vis_converter(
            self.not_null_agent_context.conv_id
        ).vis_inst(vis_tag)

    async def _render_reference_view(
            self, ref_resources: List[dict], uid: str, message_id: Optional[str] = None
    ) -> str:
        """Render a reference view for the given text."""
        return self._render_protocol(vis_tag=SystemVisTag.VisRefs.value).sync_display(
            content=ref_resources, uid=uid, message_id=message_id
        )
