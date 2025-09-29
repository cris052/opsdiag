import logging
from opsdiag_ext.vis.gptvis.tags.vis_refs import VisRefs

logger = logging.getLogger(__name__)


class DrskRefs(VisRefs):
    """DrskReferences."""

    @classmethod
    def vis_tag(cls):
        """Vis tag name.

        Returns:
            str: The tag name associated with the visualization.
        """
        return "drsk-refs"
