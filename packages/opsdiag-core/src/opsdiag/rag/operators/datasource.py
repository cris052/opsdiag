"""Datasource operator for RDBMS database."""

from typing import Any, List

from opsdiag.core.interface.operators.retriever import RetrieverOperator
from opsdiag.datasource.base import BaseConnector
from opsdiag_ext.rag.summary.rdbms_db_summary import _parse_db_summary


class DatasourceRetrieverOperator(RetrieverOperator[Any, List[str]]):
    """The Datasource Retriever Operator."""

    def __init__(self, connector: BaseConnector, **kwargs):
        """Create a new DatasourceRetrieverOperator."""
        super().__init__(**kwargs)
        self._connector = connector

    def retrieve(self, input_value: Any) -> List[str]:
        """Retrieve the database summary."""
        summary = _parse_db_summary(self._connector)
        return summary
