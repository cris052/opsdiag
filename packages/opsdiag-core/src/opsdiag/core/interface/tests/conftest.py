import pytest

from opsdiag.core.interface.storage import InMemoryStorage
from opsdiag.util.serialization.json_serialization import JsonSerializer


@pytest.fixture
def serializer():
    return JsonSerializer()


@pytest.fixture
def in_memory_storage(serializer):
    return InMemoryStorage(serializer)
