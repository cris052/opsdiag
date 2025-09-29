import asyncio
import logging
import logging.handlers
import os
import re
import sys
import threading
from dataclasses import dataclass, field
from logging import Logger
from logging.handlers import TimedRotatingFileHandler
from typing import Any, List, Optional, cast

from opsdiag.configs.model_config import resolve_root_path, LOGDIR
from opsdiag.util.i18n_utils import _
from opsdiag.util.parameter_utils import BaseParameters

try:
    from termcolor import colored
except ImportError:

    def colored(x, *args, **kwargs):
        return x

if not os.path.exists(LOGDIR):
    os.mkdir(LOGDIR)

server_error_msg = (
    "**NETWORK ERROR DUE TO HIGH TRAFFIC. PLEASE REGENERATE OR REFRESH THIS PAGE.**"
)


class TraceIdFilter(logging.Filter):
    def filter(self, record):
        from opsdiag.util.tracer import root_tracer

        trace_id = root_tracer.get_context_trace_id()
        record.trace_id = trace_id if trace_id is not None else ""
        return True


class ConvIdFilter(logging.Filter):
    def filter(self, record):
        from opsdiag.util.tracer import root_tracer

        conv_id = root_tracer.get_context_conv_id()
        record.conv_id = conv_id if conv_id is not None else ""
        return True


default_handler = None
stdout_handler = None
stderr_handler = None
_locker = threading.RLock()


def _get_logging_level() -> str:
    return os.getenv("opsdiag_LOG_LEVEL", "INFO")


@dataclass
class LoggingParameters(BaseParameters):
    """Logging parameters."""

    level: Optional[str] = field(
        default=None,
        metadata={
            "help": _(
                "Logging level, just support FATAL, ERROR, WARNING, INFO, DEBUG, NOTSET"
            ),
            "valid_values": [
                "FATAL",
                "ERROR",
                "WARNING",
                "WARNING",
                "INFO",
                "DEBUG",
                "NOTSET",
            ],
        },
    )
    file: Optional[str] = field(
        default=None,
        metadata={
            "help": _("The filename to store logs"),
        },
    )

    formatter: Optional[str] = field(
        default="%(asctime)s | %(levelname)s | %(name)s | [%(trace_id)s][%(conv_id)s]%(message)s",
        metadata={"help": _("The formatter of log record")},
    )

    # redirect_stdio: Optional[bool] = field(
    #     default=False,
    #     metadata={"help": _("Whether to redirect stdio")}
    # )

    def get_real_log_file(self) -> Optional[str]:
        """Get the real log file path.

        It will resolve the root path if the log file is not None.
        """
        if self.file:
            return resolve_root_path(self.file)
        return None


def setup_logging_level(
    logging_level: Optional[str] = None, logger_name: Optional[str] = None
):
    if not logging_level:
        logging_level = _get_logging_level()
    if type(logging_level) is str:
        logging_level = logging.getLevelName(logging_level.upper())
    if logger_name:
        logger = logging.getLogger(logger_name)
        logger.setLevel(cast(str, logging_level))
    else:
        logging.basicConfig(level=logging_level, encoding="utf-8")


def setup_logging(
    logger_name: str,
    log_config: Optional[LoggingParameters] = None,
):
    log_config = log_config or LoggingParameters()
    log_config.level = log_config.level or _get_logging_level()
    logger = _build_logger(logger_name, log_config)
    try:
        import coloredlogs

        color_level = log_config.level if log_config.level else "INFO"
        coloredlogs.install(level=color_level, logger=logger)
    except ImportError:
        pass
    return logger

def digest(logger:Logger, digest_name:str, **items):
    logger.info(f"[DIGEST][{digest_name}]" + ",".join([f"{key}=[{value}]" for key, value in items.items()]))

def get_gpu_memory(max_gpus=None):
    import torch

    gpu_memory = []
    num_gpus = (
        torch.cuda.device_count()
        if max_gpus is None
        else min(max_gpus, torch.cuda.device_count())
    )
    for gpu_id in range(num_gpus):
        with torch.cuda.device(gpu_id):
            device = torch.cuda.current_device()
            gpu_properties = torch.cuda.get_device_properties(device)
            total_memory = gpu_properties.total_memory / (1024**3)
            allocated_memory = torch.cuda.memory_allocated() / (1024**3)
            available_memory = total_memory - allocated_memory
            gpu_memory.append(available_memory)
    return gpu_memory


def _build_logger(
    logger_name: Optional[str],
    log_config: LoggingParameters,
) -> Logger:
    def _build_handler(_config: LoggingParameters) -> logging.Handler:
        # 创建TimedRotatingFileHandler，每天午夜轮转
        _handler = TimedRotatingFileHandler(
            filename=os.path.join(
                LOGDIR, _config.file or "opsdiag_default.log"
            ),  # 日志文件名
            when="midnight",  # 每天午夜轮转
            interval=1,  # 间隔1天
            backupCount=7,  # 保留7天日志
            encoding="utf-8",  # 编码
            delay=False,  # 立即写入
            utc=False,  # 使用本地时间
        )
        # 自定义文件名后缀（格式为yyyymmdd）
        _handler.suffix = "%Y%m%d"
        # 更新正则表达式以匹配新后缀格式（确保自动删除旧文件）
        _handler.extMatch = re.compile(r"^\d{8}$", re.ASCII)

        # 设置日志格式
        _handler.setFormatter(
            logging.Formatter(fmt=_config.formatter, datefmt="%Y-%m-%d %H:%M:%S")
        )

        _handler.addFilter(TraceIdFilter())
        _handler.addFilter(ConvIdFilter())
        return _handler

    def _get_default_handler() -> logging.Handler:
        global default_handler
        if not default_handler:
            with _locker:
                if not default_handler:
                    default_handler = _build_handler(LoggingParameters())
        return default_handler

    def _get_stdout_handlers() -> list[logging.StreamHandler]:
        global stdout_handler, stderr_handler
        if not stdout_handler:
            with _locker:
                stdout_handler = (
                    stdout_handler
                    if stdout_handler
                    else logging.StreamHandler(sys.stdout)
                )
                stdout_handler.setFormatter(
                    logging.Formatter(
                        fmt=LoggingParameters().formatter, datefmt="%Y-%m-%d %H:%M:%S"
                    )
                )
                stdout_handler.setLevel(_get_logging_level())
        # if not stderr_handler:
        #     with _locker:
        #         stderr_handler = stderr_handler if stderr_handler else logging.StreamHandler(sys.stderr)
        #         stderr_handler.setFormatter(logging.Formatter(fmt=LoggingParameters().formatter, datefmt="%Y-%m-%d %H:%M:%S"))
        #         stderr_handler.setLevel("WARN")
        # return [stdout_handler, stderr_handler]
        return [stdout_handler]

    def _get_handler() -> logging.Handler:
        return _build_handler(log_config) if log_config.file else _get_default_handler()

    if logger_name:
        # 确保root log已初始化
        _build_logger(None, LoggingParameters())

    logger = logging.getLogger(logger_name)
    global default_handler
    if logger.handlers and default_handler:
        # 已经初始化过了
        return logger

    handler = _get_handler()
    with _locker:
        logger.addHandler(handler)
        logger.setLevel(log_config.level if log_config.level else _get_logging_level())

        # 由于propagate=True，所有日志都会落到root logger中 因此只需root logger输出到stdout中 以免重复
        logger.propagate = True
        if not logger_name:  # or log_config.redirect_stdio:
            for hdlr in _get_stdout_handlers():
                logger.addHandler(hdlr)

    # Debugging to print all handlers
    logger.debug(f"Logger {logger_name} handlers: {logger.handlers}")

    return logger


def get_or_create_event_loop() -> asyncio.BaseEventLoop:
    loop = None
    try:
        loop = asyncio.get_event_loop()
        assert loop is not None
        return cast(asyncio.BaseEventLoop, loop)
    except RuntimeError as e:
        if "no running event loop" not in str(e) and "no current event loop" not in str(
            e
        ):
            raise e
        logging.warning("Cant not get running event loop, create new event loop now")
    return cast(asyncio.BaseEventLoop, asyncio.get_event_loop_policy().new_event_loop())


def logging_str_to_uvicorn_level(log_level_str):
    level_str_mapping = {
        "CRITICAL": "critical",
        "ERROR": "error",
        "WARNING": "warning",
        "INFO": "info",
        "DEBUG": "debug",
        "NOTSET": "info",
    }
    return level_str_mapping.get(log_level_str.upper(), "info")


class EndpointFilter(logging.Filter):
    """Disable access log on certain endpoint

    source: https://github.com/encode/starlette/issues/864#issuecomment-1254987630
    """

    def __init__(
        self,
        path: str,
        *args: Any,
        **kwargs: Any,
    ):
        super().__init__(*args, **kwargs)
        self._path = path

    def filter(self, record: logging.LogRecord) -> bool:
        return record.getMessage().find(self._path) == -1


def setup_http_service_logging(exclude_paths: Optional[List[str]] = None):
    """Setup http service logging

    Now just disable some logs

    Args:
        exclude_paths (List[str]): The paths to disable log
    """
    if not exclude_paths:
        # Not show heartbeat log
        exclude_paths = ["/api/controller/heartbeat", "/api/health"]
    uvicorn_logger = logging.getLogger("uvicorn.access")
    if uvicorn_logger:
        for path in exclude_paths:
            uvicorn_logger.addFilter(EndpointFilter(path=path))
    httpx_logger = logging.getLogger("httpx")
    if httpx_logger:
        httpx_logger.setLevel(logging.WARNING)
