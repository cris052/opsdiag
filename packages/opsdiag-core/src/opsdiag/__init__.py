"""DERISK: Next Generation Data Interaction Solution with LLMs."""

# 临时兼容性导入 - 允许旧的derisk导入继续工作
import sys

# 避免循环导入，直接导入_version模块
from . import _version  # noqa: E402
from .component import BaseComponent, SystemApp  # noqa: F401

# 设置模块别名，允许旧的derisk导入继续工作
sys.modules['derisk'] = sys.modules[__name__]

_CORE_LIBS = ["core", "rag", "model", "agent", "datasource", "storage", "train", "vis"]
_SERVE_LIBS = ["serve"]
_LIBS = _CORE_LIBS + _SERVE_LIBS


__version__ = _version.version

__ALL__ = ["__version__", "SystemApp", "BaseComponent"]


def __getattr__(name: str):
    # Lazy load
    import importlib

    if name in _LIBS:
        return importlib.import_module("." + name, __name__)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
