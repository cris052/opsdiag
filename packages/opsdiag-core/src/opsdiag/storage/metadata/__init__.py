"""Module for handling metadata storage."""

from opsdiag.storage.metadata._base_dao import BaseDao  # noqa: F401
from opsdiag.storage.metadata.db_factory import UnifiedDBManagerFactory  # noqa: F401
from opsdiag.storage.metadata.db_manager import (  # noqa: F401
    BaseModel,
    DatabaseManager,
    Model,
    create_model,
    db,
)

__ALL__ = [
    "db",
    "Model",
    "DatabaseManager",
    "create_model",
    "BaseModel",
    "BaseDao",
    "UnifiedDBManagerFactory",
]
