import json
import typing
from typing import cast, Union, get_args, Any, Optional, Type

from opsdiag.agent import ConversableAgent
from opsdiag.agent.core.agent import ContextEngineeringKey
from opsdiag.agent.resource import FunctionTool
from opsdiag_serve.agent.resource.knowledge_pack import KnowledgePackSearchResource

AbilityType = Union[FunctionTool, ConversableAgent, KnowledgePackSearchResource]


def valid_ability_types() -> tuple[Any, ...]:
    return typing.get_args(AbilityType)


class Ability:
    _ability: AbilityType = None

    @classmethod
    def by(cls, source: Any) -> Optional["Ability"]:
        if not cls._actual_type(source):
            return None

        # 增强知识检索资源检测逻辑 - 避免纯对话场景误调用embedding
        if isinstance(source, KnowledgePackSearchResource):
            # 检查是否为空知识库
            if source.is_empty:
                return None
            
            # 检查是否在纯对话模式下（可通过环境变量或配置控制）
            import os
            disable_knowledge = os.getenv('DERISK_DISABLE_KNOWLEDGE_RETRIEVAL', 'false').lower() == 'true'
            if disable_knowledge:
                return None

        return Ability().bind(source)

    def bind(self, ability: AbilityType):
        self._ability = ability
        return self

    @property
    def name(self) -> str:
        if isinstance(self._ability, KnowledgePackSearchResource):
            return "knowledge_retrieve"
        return self._ability.name

    @property
    def description(self) -> str:
        if isinstance(self._ability, FunctionTool):
            return self._ability.name
        elif isinstance(self._ability, ConversableAgent):
            return self._ability.desc
        elif isinstance(self._ability, KnowledgePackSearchResource):
            return self._ability.description
        raise NotImplementedError

    @property
    def context_info(self) -> (str, Any):
        _mapper = {
            FunctionTool: lambda: (ContextEngineeringKey.AVAILABLE_TOOLS.value, self._ability.name),
            ConversableAgent: lambda: (ContextEngineeringKey.AVAILABLE_AGENTS.value, self._ability.name),
            KnowledgePackSearchResource: lambda: (ContextEngineeringKey.AVAILABLE_KNOWLEDGE.value, self._ability.name),
        }
        return _mapper[self.actual_type]()

    @property
    def actual_type(self) -> Type:
        return self._actual_type(self._ability)

    @classmethod
    def _actual_type(cls, _ability) -> Optional[Type]:
        for _type in get_args(AbilityType):
            if _ability == _type or isinstance(_ability, _type):
                return _type
        return None
        # return next((_type for _type in get_args(_AbilityType) if isinstance(_ability, _type)), None)

    async def get_prompt(self) -> str:
        if isinstance(self._ability, FunctionTool):
            prompt, _ = await self._ability.get_prompt(lang="zh")
            return prompt

        elif isinstance(self._ability, ConversableAgent):
            agent = cast(ConversableAgent, self._ability)
            return "**id**: " + agent.name + "\n\n**描述**: " + agent.desc

        elif isinstance(self._ability, KnowledgePackSearchResource):
            parameters: list[dict] = [
                {
                    "name": "query",
                    "type": "string",
                    "description": "检索内容",
                    "required": True,
                },
                {
                    "name": "knowledge_ids",
                    "type": "Array",
                    "description": "需要检索相关知识库id列表,['id1','id2'], 如果都不涉及返回[]",
                    "required": True,
                },
            ]
            return f"**id**: {self.name}\n\n**描述**: {self.description} \n\n**参数**:\n\n{json.dumps(parameters, ensure_ascii=False)}"

        raise NotImplementedError
