"""Import all models to make sure they are registered with SQLAlchemy."""

from opsdiag.model.cluster.registry_impl.db_storage import ModelInstanceEntity
from opsdiag.storage.chat_history.chat_history_db import (
    ChatHistoryEntity,
    ChatHistoryMessageEntity,
)
from opsdiag_app.openapi.api_v1.feedback.feed_back_db import ChatFeedBackEntity
from opsdiag_serve.agent.app.recommend_question.recommend_question import (
    RecommendQuestionEntity,
)

from opsdiag_serve.datasource.manages.connect_config_db import ConnectConfigEntity
from opsdiag_serve.file.models.models import ServeEntity as FileServeEntity
from opsdiag_serve.flow.models.models import ServeEntity as FlowServeEntity
from opsdiag_serve.flow.models.models import VariablesEntity as FlowVariableEntity
from opsdiag_serve.prompt.models.models import ServeEntity as PromptManageEntity
from opsdiag_serve.rag.models.chunk_db import DocumentChunkEntity
from opsdiag_serve.rag.models.document_db import KnowledgeDocumentEntity
from opsdiag_serve.rag.models.models import KnowledgeSpaceEntity
from opsdiag_serve.mcp.models.models import ServeEntity as McpManageEntity
from opsdiag_serve.model.models.models import ServeEntity as ModelManageentity

_MODELS = [
    FileServeEntity,
    PromptManageEntity,
    KnowledgeSpaceEntity,
    KnowledgeDocumentEntity,
    DocumentChunkEntity,
    ChatFeedBackEntity,
    ConnectConfigEntity,
    ChatHistoryEntity,
    ChatHistoryMessageEntity,
    ModelInstanceEntity,
    FlowServeEntity,
    RecommendQuestionEntity,
    FlowVariableEntity,
    McpManageEntity,
    ModelManageentity,
]
