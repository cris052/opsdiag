from datetime import datetime
from typing import Optional

from opsdiag.agent import AgentMessage, AgentContext, Agent
from opsdiag.agent.core.reasoning.reasoning_arg_supplier import ReasoningArgSupplier
from opsdiag_ext.agent.agents.reasoning.default.reasoning_agent import ReasoningAgent

_NAME = "DEFAULT_AGENT_NAME_ARG_SUPPLIER"
_DESCRIPTION = "默认参数引擎: agent_name，当前Agent的名称"


class DefaultAgentNameArgSupplier(ReasoningArgSupplier):
    @property
    def name(self) -> str:
        return _NAME

    @property
    def description(self) -> str:
        return _DESCRIPTION

    @property
    def arg_key(self) -> str:
        return "agent_name"

    async def supply(
        self,
        prompt_param: dict,
        agent: Agent,
        agent_context: Optional[AgentContext] = None,
        received_message: Optional[AgentMessage] = None,
        **kwargs,
    ) -> None:
        prompt_param[self.arg_key] = agent.name
