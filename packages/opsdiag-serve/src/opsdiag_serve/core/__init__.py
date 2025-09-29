from typing import Any

from opsdiag.util.executor_utils import BlockingFunction, DefaultExecutorFactory
from opsdiag.util.executor_utils import blocking_func_to_async as _blocking_func_to_async
from opsdiag_serve.core.config import BaseServeConfig as BaseServeConfig
from opsdiag_serve.core.schemas import (  # noqa: F401
    ResourceParameters,
    ResourceTypes,
    Result,
    add_exception_handler,
)
from opsdiag_serve.core.serve import BaseServe as BaseServe
from opsdiag_serve.core.service import BaseService as BaseService

__ALL__ = [
    "Result",
    "add_exception_handler",
    "BaseServeConfig",
    "BaseService",
    "BaseServe",
    "add_exception_handler",
    "ResourceParameters",
    "ResourceTypes",
]


async def blocking_func_to_async(
    system_app, func: BlockingFunction, *args, **kwargs
) -> Any:
    """Run a potentially blocking function within an executor."""
    executor = DefaultExecutorFactory.get_instance(system_app).create()
    return await _blocking_func_to_async(executor, func, *args, **kwargs)
