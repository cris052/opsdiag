import asyncio
from abc import ABC
from typing import List, Optional, Any

from opsdiag.core import (
    BaseMessage,
    ChatPromptTemplate,
    HumanPromptTemplate,
    ModelMessage,
)
from opsdiag.core.awel import JoinOperator
from opsdiag.core.awel.flow import (
    IOField,
    OperatorCategory,
    OperatorType,
    Parameter,
    ViewMetadata,
)
from opsdiag.core.awel.task.base import IN, OUT
from opsdiag.core.interface.operators.prompt_operator import BasePromptBuilderOperator
from opsdiag.core.interface.operators.retriever import RetrieverOperator
from opsdiag.rag.embedding.embedding_factory import RerankEmbeddingFactory
from opsdiag.rag.retriever.rerank import RerankEmbeddingsRanker
from opsdiag.storage.vector_store.filters import MetadataFilters
from opsdiag.util.function_utils import rearrange_args_by_type
from opsdiag.util.i18n_utils import _
from opsdiag_serve.rag.api.schemas import KnowledgeSearchResponse, DocumentSearchResponse
from opsdiag_serve.rag.retriever.knowledge_space import KnowledgeSpaceRetriever


class SpaceRetrieverOperator(RetrieverOperator[IN, OUT], ABC):
    """knowledge space retriever operator."""

    def __init__(
        self,
        knowledge_ids: Optional[List[str]],
        rerank_top_k: Optional[int] = 5,
        single_knowledge_top_k: Optional[int] = 10,
        similarity_top_k: Optional[int] = 10,
        retrieve_mode: Optional[str] = "semantic",
        metadata_filter: Optional[bool] = True,
        rerank: Optional[bool] = True,
        similarity_score_threshold: Optional[float] = 0.0,
        bm25_score_threshold: Optional[float] = 0.0,
        rerank_score_threshold: Optional[float] = 0.3,
        rerank_model: Optional[str] = None,
        llm_model: Optional[str] = None,
        metadata_filters: Optional[MetadataFilters] = None,
        tag_filters: Optional[dict] = None,
        system_app: Optional[Any] = None,
        **kwargs,
    ):
        """
        Args:
            space_id (str): The space name.
            top_k (Optional[int]): top k.
            score_threshold (
            Optional[float], optional
            ): The recall score. Defaults to 0.3.
        """
        self._knowledge_ids = knowledge_ids
        self._top_k = rerank_top_k
        self._score_threshold = rerank_score_threshold
        self._single_knowledge_top_k = single_knowledge_top_k
        self._similarity_top_k = similarity_top_k
        self._similarity_score_threshold = similarity_score_threshold
        self._bm25_score_threshold = bm25_score_threshold
        self._retrieve_mode = retrieve_mode
        self._rerank = rerank
        self._rerank_model = rerank_model
        self._metadata_filter = metadata_filter
        self._tag_filters = tag_filters
        self._llm_model = llm_model
        self._metadata_filters = metadata_filters
        self._system_app = system_app

        super().__init__(**kwargs)

    async def aretrieve(self, query: IN) -> OUT:
        """Map input value to output value.

        Args:
            query (IN): The input value.

        Returns:
            OUT: The output value.
        """

        search_tasks = []
        query_to_candidates_map = {}
        # todo multi thread
        sub_queries = query.get("sub_queries")
        raw_query = query.get("query")
        if not sub_queries:
            sub_queries = [raw_query]
        for knowledge_id in self._knowledge_ids:
            space_retriever = KnowledgeSpaceRetriever(
                space_id=knowledge_id,
                top_k=self._single_knowledge_top_k,
                retrieve_mode=self._retrieve_mode,
                llm_model=self._llm_model,
                tag_filters=self._tag_filters,
                system_app=self._system_app,
            )

            if isinstance(sub_queries, str):
                search_tasks.append(
                    space_retriever.aretrieve_with_scores(
                        sub_queries,
                        self._similarity_score_threshold,
                        self._metadata_filters,
                    )
                )
            elif isinstance(sub_queries, list):
                for q in sub_queries:
                    search_tasks.append(
                        space_retriever.aretrieve_with_scores(
                            q, self._similarity_score_threshold, self._metadata_filters
                        )
                    )
                    # query_to_candidates_map[q] = []
                    # candidates = await asyncio.gather(*search_tasks)
        task_results = await asyncio.gather(*search_tasks)
        if isinstance(sub_queries, str):
            query_to_candidates_map[query] = task_results
        elif isinstance(sub_queries, list):
            for chunks in task_results:
                for chunk in chunks:
                    query = chunk.query
                    if query not in query_to_candidates_map:
                        query_to_candidates_map[query] = [chunk]
                    else:
                        query_to_candidates_map[query].append(chunk)

        if self._rerank:
            if self._rerank_model:
                rerank_embeddings = RerankEmbeddingFactory.get_instance(
                    self.system_app
                ).create(model_name=self._rerank_model)
            else:
                rerank_embeddings = RerankEmbeddingFactory.get_instance(
                    self.system_app
                ).create()
            reranker = RerankEmbeddingsRanker(rerank_embeddings, topk=self._top_k)

            rerank_candidates_map = {}
            sub_queries = {}
            for q, candidates in query_to_candidates_map.items():
                rerank_candidates_map[q] = reranker.rank(candidates, q)
                if self._score_threshold:
                    rerank_candidates_map[q] = [
                        candidate
                        for candidate in rerank_candidates_map[q]
                        if candidate.score >= self._score_threshold
                    ]

            results = {}
            for q, rerank_candidates in rerank_candidates_map.items():
                results[q] = [candidate.to_dict() for candidate in rerank_candidates]
                sub_queries[q] = "\n".join(
                    [chunk.content for chunk in rerank_candidates]
                )
            documents = []
            for chunks in list(rerank_candidates_map.values()):
                documents.extend([chunk for chunk in chunks])
            return KnowledgeSearchResponse(
                document_response_list=deduplicate_documents(documents),
                sub_queries=sub_queries,
                references=results,
                raw_query=raw_query,
            )
        documents = []
        for chunks in list(query_to_candidates_map.values()):
            documents.extend([chunk for chunk in chunks])
        return KnowledgeSearchResponse(
            document_response_list=deduplicate_documents(documents),
            sub_queries=sub_queries,
            references=[],
            raw_query=raw_query,
        )


def deduplicate_documents(documents: List):
    """
    Remove duplicate results based on text content.
    """
    content_to_best_chunk = {}

    for chunk in documents:
        content = chunk.content
        score = chunk.score
        res = DocumentSearchResponse(
            content=chunk.content,
            score=chunk.score,
            yuque_url=chunk.metadata.get("yuque_url"),
            doc_name=chunk.metadata.get("doc_name") or chunk.metadata.get("title"),
            metadata=chunk.metadata,
            doc_id=chunk.metadata.get("doc_id"),
            knowledge_id=chunk.metadata.get("knowledge_id"),
            create_time=chunk.metadata.get("create_time"),
            modified_time=chunk.metadata.get("modified_time"),
            doc_type=chunk.metadata.get("doc_type"),
            chunk_id=chunk.metadata.get("chunk_id"),
        )
        if content not in content_to_best_chunk or score > content_to_best_chunk[
            content
        ].get("score"):
            content_to_best_chunk[content] = res.dict()
    return list(content_to_best_chunk.values())


class KnowledgeSpacePromptBuilderOperator(
    BasePromptBuilderOperator, JoinOperator[List[ModelMessage]]
):
    """The operator to build the prompt with static prompt.

    The prompt will pass to this operator.
    """

    metadata = ViewMetadata(
        label=_("Knowledge Space Prompt Builder Operator"),
        name="knowledge_space_prompt_builder_operator",
        description=_("Build messages from prompt template and chat history."),
        operator_type=OperatorType.JOIN,
        category=OperatorCategory.CONVERSION,
        parameters=[
            Parameter.build_from(
                _("Chat Prompt Template"),
                "prompt",
                ChatPromptTemplate,
                description=_("The chat prompt template."),
            ),
            Parameter.build_from(
                _("History Key"),
                "history_key",
                str,
                optional=True,
                default="chat_history",
                description=_("The key of history in prompt dict."),
            ),
            Parameter.build_from(
                _("String History"),
                "str_history",
                bool,
                optional=True,
                default=False,
                description=_("Whether to convert the history to string."),
            ),
        ],
        inputs=[
            IOField.build_from(
                _("user input"),
                "user_input",
                str,
                is_list=False,
                description=_("user input"),
            ),
            IOField.build_from(
                _("space related context"),
                "related_context",
                List,
                is_list=False,
                description=_("context of knowledge space."),
            ),
            IOField.build_from(
                _("History"),
                "history",
                BaseMessage,
                is_list=True,
                description=_("The history."),
            ),
        ],
        outputs=[
            IOField.build_from(
                _("Formatted Messages"),
                "formatted_messages",
                ModelMessage,
                is_list=True,
                description=_("The formatted messages."),
            )
        ],
    )

    def __init__(
        self,
        prompt: ChatPromptTemplate,
        history_key: str = "chat_history",
        check_storage: bool = True,
        str_history: bool = False,
        **kwargs,
    ):
        """Create a new history dynamic prompt builder operator.
        Args:

            prompt (ChatPromptTemplate): The chat prompt template.
            history_key (str, optional): The key of history in prompt dict. Defaults to
                "chat_history".
            check_storage (bool, optional): Whether to check the storage. Defaults to
                True.
            str_history (bool, optional): Whether to convert the history to string.
                Defaults to False.
        """

        self._prompt = prompt
        self._history_key = history_key
        self._str_history = str_history
        BasePromptBuilderOperator.__init__(self, check_storage=check_storage, **kwargs)
        JoinOperator.__init__(self, combine_function=self.merge_context, **kwargs)

    @rearrange_args_by_type
    async def merge_context(
        self,
        user_input: str,
        related_context: List[str],
        history: Optional[List[BaseMessage]],
    ) -> List[ModelMessage]:
        """Merge the prompt and history."""
        prompt_dict = dict()
        prompt_dict["context"] = related_context
        for prompt in self._prompt.messages:
            if isinstance(prompt, HumanPromptTemplate):
                prompt_dict[prompt.input_variables[0]] = user_input

        if history:
            if self._str_history:
                prompt_dict[self._history_key] = BaseMessage.messages_to_string(history)
            else:
                prompt_dict[self._history_key] = history
        return await self.format_prompt(self._prompt, prompt_dict)
