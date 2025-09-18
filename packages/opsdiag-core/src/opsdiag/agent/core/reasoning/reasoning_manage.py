from opsdiag import BaseComponent, SystemApp
from opsdiag.agent.core.reasoning.reasoning_arg_supplier import ReasoningArgSupplier
from opsdiag.agent.core.reasoning.reasoning_engine import ReasoningEngine
from opsdiag.component import ComponentType
from opsdiag.core.awel import BaseOperator

_HAS_SCAN = False


class ReasoningManage(BaseComponent):
    name = ComponentType.REASONING_MANAGER

    def init_app(self, system_app: SystemApp):
        pass

    def after_start(self):
        global _HAS_SCAN

        if _HAS_SCAN:
            return

        _register()

        _HAS_SCAN = True


def _register():
    from opsdiag.util.module_utils import ModelScanner, ScannerConfig

    for baseclass, path in [
        (ReasoningEngine, "opsdiag_ext.reasoning_engine"),
        (ReasoningArgSupplier, "opsdiag_ext.reasoning_arg_supplier"),
        (BaseOperator, "opsdiag_ext.agent.agents.awel"),
    ]:
        scanner = ModelScanner[baseclass]()
        config = ScannerConfig(
            module_path=path,
            base_class=baseclass,
            recursive=True,
        )
        scanner.scan_and_register(config)
        if hasattr(baseclass, "register"):
            for _, subclass in scanner.get_registered_items().items():
                baseclass.register(subclass=subclass)
