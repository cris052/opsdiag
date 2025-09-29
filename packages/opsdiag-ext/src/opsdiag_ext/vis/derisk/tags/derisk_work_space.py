import logging
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


class WorkItem(DrskVisBase):
    conv_id: Optional[str] = Field(None, description="当前工作项所属对话")
    topic: Optional[str] = Field(None, description="当前工作项所属话题")
    title: Optional[str] = Field(None, description="当前工作项标题")
    description: Optional[str] = Field(None, description="当前工作项内容描述")
    status: Optional[str] = Field(None, description="当前工作项状态")
    start_time: Optional[str] = Field(None, description="当前工作项开始时间")
    cost: Optional[int] = Field(None, description="当前工作项耗时")
    markdown: Optional[str] = Field(None, description="当前工作项的模型和Action空间")

class WorkSpaceContent(DrskVisBase):
    agent_role: Optional[str] = Field(None, description="agent role")
    agent_name: Optional[str] = Field(None, description="agent name")
    description: Optional[str] = Field(None, description="agent description")
    avatar: Optional[str] = Field(None, description="task logo")
    vis: Optional[str] = Field(None, description="this content vis tag")
    items: Optional[List[WorkItem]] = Field(None, description="工作空间资源管理器")


class WorkSpace(Vis):
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
            WorkSpaceContent.model_validate(content)
            return content
        except ValidationError as e:
            logger.warning(
                f"WorkSpace可视化组件收到了非法的数据内容，可能导致显示失败！{content}"
            )
            return content

    @classmethod
    def vis_tag(cls):
        """Vis tag name.

        Returns:
            str: The tag name associated with the visualization.
        """
        return "derisk-work-space"
