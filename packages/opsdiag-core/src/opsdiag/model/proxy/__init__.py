"""Proxy models."""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from opsdiag.model.proxy.llms.chatgpt import OpenAILLMClient
    from opsdiag.model.proxy.llms.claude import ClaudeLLMClient
    from opsdiag.model.proxy.llms.deepseek import DeepseekLLMClient
    from opsdiag.model.proxy.llms.gemini import GeminiLLMClient
    from opsdiag.model.proxy.llms.gitee import GiteeLLMClient
    from opsdiag.model.proxy.llms.moonshot import MoonshotLLMClient
    from opsdiag.model.proxy.llms.ollama import OllamaLLMClient
    from opsdiag.model.proxy.llms.siliconflow import SiliconFlowLLMClient
    from opsdiag.model.proxy.llms.spark import SparkLLMClient
    from opsdiag.model.proxy.llms.tongyi import TongyiLLMClient
    from opsdiag.model.proxy.llms.wenxin import WenxinLLMClient
    from opsdiag.model.proxy.llms.zhipu import ZhipuLLMClient
    from opsdiag.model.proxy.llms.volcengine import VolcengineLLMClient

def __lazy_import(name):
    module_path = {
        "OpenAILLMClient": "opsdiag.model.proxy.llms.chatgpt",
        "ClaudeLLMClient": "opsdiag.model.proxy.llms.claude",
        "GeminiLLMClient": "opsdiag.model.proxy.llms.gemini",
        "SiliconFlowLLMClient": "opsdiag.model.proxy.llms.siliconflow",
        "SparkLLMClient": "opsdiag.model.proxy.llms.spark",
        "TongyiLLMClient": "opsdiag.model.proxy.llms.tongyi",
        "WenxinLLMClient": "opsdiag.model.proxy.llms.wenxin",
        "ZhipuLLMClient": "opsdiag.model.proxy.llms.zhipu",
        "MoonshotLLMClient": "opsdiag.model.proxy.llms.moonshot",
        "OllamaLLMClient": "opsdiag.model.proxy.llms.ollama",
        "DeepseekLLMClient": "opsdiag.model.proxy.llms.deepseek",
        "GiteeLLMClient": "opsdiag.model.proxy.llms.gitee",
        "AntEngineLLMClient": "opsdiag.model.proxy.llms.antengine",
        "VolcengineLLMClient": "opsdiag.model.proxy.llms.volcengine",
    }

    if name in module_path:
        module = __import__(module_path[name], fromlist=[name])
        return getattr(module, name)
    else:
        raise AttributeError(f"module {__name__} has no attribute {name}")


def __getattr__(name):
    return __lazy_import(name)


__all__ = [
    "OpenAILLMClient",
    "ClaudeLLMClient",
    "GeminiLLMClient",
    "TongyiLLMClient",
    "ZhipuLLMClient",
    "WenxinLLMClient",
    "SiliconFlowLLMClient",
    "SparkLLMClient",
    "MoonshotLLMClient",
    "OllamaLLMClient",
    "DeepseekLLMClient",
    "GiteeLLMClient",
    "VolcengineLLMClient",
]
