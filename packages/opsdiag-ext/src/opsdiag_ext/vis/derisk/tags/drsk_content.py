import uuid
from typing import Optional, Dict, Any
from opsdiag._private.pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    model_to_json,
    model_validator,
    model_to_dict,
)
from opsdiag.vis import Vis
from .drsk_base import DrskVisBase


class DrskTextContent(DrskVisBase):
    markdown: str = Field(..., description="drsk drsk_vis message content")


class DrskContent(Vis):
    """DrskThinking."""

    def __init__(self, **kwargs):
        uid = kwargs.get("uid")
        self._uid = uid if uid else uuid.uuid4().hex
        super().__init__(**kwargs)

    def sync_generate_param(self, **kwargs) -> Optional[Dict[str, Any]]:
        """Generate the parameters required by the drsk_vis protocol.

        Display corresponding content using drsk_vis protocol

        Args:
            **kwargs:

        Returns:
        drsk_vis protocol text
        """
        content = kwargs["content"]
        if isinstance(content, str):
            drsk_think = DrskTextContent(uid=self._uid, type="all", markdown=content)
            return drsk_think.to_dict()
        elif isinstance(content, dict):
            if "uid" not in content:
                content["uid"] = self._uid
            if "type" not in content:
                content["type"] = "all"
            return content
        else:
            return content

    @classmethod
    def vis_tag(cls):
        """Vis tag name.

        Returns:
            str: The tag name associated with the visualization.
        """
        return "drsk-content"
