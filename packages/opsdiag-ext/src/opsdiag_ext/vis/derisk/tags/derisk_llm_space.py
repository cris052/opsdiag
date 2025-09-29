import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Union

from pydantic_core._pydantic_core import ValidationError
from opsdiag._private.pydantic import (
    Field,
    BaseModel,
    model_to_json,
    model_validator,
    model_to_dict,
)
from typing import Optional

from opsdiag.vis import Vis
from opsdiag_ext.vis.derisk.tags.drsk_base import DrskVisBase


logger = logging.getLogger(__name__)

class LLMSpaceContent(DrskVisBase):
    markdown: Optional[str] = Field(None, description="llm space content")
    token_use: Optional[int] = Field(0, description="token use count")
    llm_name: Optional[str] = Field(None, description="llm name")
    avatar: Optional[str] = Field(None, description="llm avatar")
    start_time: Optional[str] = Field(None, description="模型推理开始时间")
    firt_out_time: Optional[datetime] = Field(None, description="模型首token时间")
    cost: Optional[datetime] = Field(None, description="模型推理耗时")

    say_to_user: Optional[str] = Field(None, description="输出给用户的展示消息")
    status: Optional[str] = Field(None, description="模型消息输出状态")



class LLMSpace(Vis):
    """WorkSpace."""

    def sync_generate_param(self, **kwargs) -> Optional[Dict[str, Any]]:
        """Generate the parameters required by the vis protocol.

        Display corresponding content using vis protocol

        Args:
            **kwargs:

        Returns:
        vis protocol text
        """
        content = kwargs["content"]
        try:
            LLMSpaceContent.model_validate(content)
            return content
        except ValidationError as e:
            logger.warning(
                f"LLMSpace可视化组件收到了非法的数据内容，可能导致显示失败！{content}"
            )
            return content

    @classmethod
    def vis_tag(cls):
        """Vis tag name.

        Returns:
            str: The tag name associated with the visualization.
        """
        return "derisk-llm-space"