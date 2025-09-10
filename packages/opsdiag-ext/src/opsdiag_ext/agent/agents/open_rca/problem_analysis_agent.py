"""Problem Analysis Agent for private cloud operations troubleshooting."""

import logging
from typing import List, Type

from opsdiag._private.pydantic import Field
from opsdiag.agent.core.base_agent import ConversableAgent
from opsdiag.agent.core.profile import DynConfig, ProfileConfig
from opsdiag.agent.util.llm.llm import LLMStrategyType  
from opsdiag_ext.agent.agents.open_rca.actions.problem_analysis_action import (
    ProblemAnalysisAction, 
    CloudResourceAnalysisAction
)

logger = logging.getLogger(__name__)

# 系统提示词模板
_PROBLEM_ANALYSIS_SYSTEM_TEMPLATE = """你是一名私有云运维专家，负责分析用户提出的故障问题。

## 核心职责
作为私有云运维专家，你需要对用户提出的故障问题进行专业的结构化分析，帮助快速定位问题并制定解决方案。

## 分析要求
请根据用户问题，给出结构化的初步分析结果，输出必须包含以下四个部分：

### 1. 对象
涉及的云资源或组件，包括但不限于：
- 虚拟机（VM实例、计算资源）
- 网络（网卡、路由、防火墙、负载均衡）
- 存储（磁盘、卷、文件系统、存储池）
- 容器（Docker、Kubernetes、Pod）
- 控制节点（管理节点、控制器）
- 数据库（MySQL、PostgreSQL、Redis等）
- 监控系统（Prometheus、Grafana、Zabbix）
- 日志系统（ELK、Fluentd等）

### 2. 症状
用户描述的问题现象，需要准确提取和总结：
- 故障表现（错误信息、异常行为）
- 影响范围（受影响的服务、用户）
- 发生时间（开始时间、持续时间、频率）
- 环境背景（系统版本、配置变更）

### 3. 初步假设
基于症状和经验，列出可能的根因分析（1~3个，按可能性排序）：
- **高可能性**：最可能的根本原因
- **中可能性**：次要可能的原因
- **低可能性**：不太可能但需要排除的原因

每个假设需要包含：
- 假设名称
- 可能性等级（高/中/低）
- 详细描述和依据

### 4. 建议下一步验证
需要采集或查询的数据，用于验证假设：
- **监控指标**：CPU、内存、磁盘、网络等性能指标
- **系统日志**：操作系统、应用程序、服务日志
- **配置信息**：系统配置、网络配置、应用配置
- **网络测试**：连通性测试、性能测试
- **状态检查**：服务状态、进程状态、资源状态

## 分析原则
1. **准确性**：基于问题描述进行客观分析
2. **完整性**：覆盖所有可能的影响因素
3. **实用性**：提供可操作的验证建议
4. **优先级**：按重要性和可能性排序

## 输出格式
请严格按照以下JSON格式输出分析结果：

```json
{
  "对象": ["涉及的云资源或组件列表"],
  "症状": "用户描述的问题现象总结",
  "初步假设": [
    {
      "假设": "假设名称",
      "可能性": "高/中/低",
      "描述": "详细描述和分析依据"
    }
  ],
  "建议下一步验证": [
    {
      "类型": "验证类型",
      "内容": "具体的验证步骤和方法"
    }
  ]
}
```

现在请开始分析用户的问题。
"""

_USER_TEMPLATE = """请分析以下私有云故障问题：

问题描述：{{question}}

请提供结构化的分析结果。
"""

_WRITE_MEMORY_TEMPLATE = """\
{% if question %}问题: {{ question }} {% endif %}
{% if thought %}分析思路: {{ thought }} {% endif %}
{% if action %}执行动作: {{ action }} {% endif %}
{% if action_input %}输入参数: {{ action_input }} {% endif %}
{% if observation %}观察结果: {{ observation }} {% endif %}
"""


class ProblemAnalysisAgent(ConversableAgent):
    """私有云运维问题分析Agent - LLM分析专家"""

    profile: ProfileConfig = ProfileConfig(
        name=DynConfig(
            "ProblemAnalysisAgent",
            category="agent",
            key="derisk_agent_problem_analysis_profile_name",
        ),
        role=DynConfig(
            "私有云运维专家",
            category="agent",
            key="derisk_agent_problem_analysis_profile_role",
        ),
        goal=DynConfig(
            "作为私有云运维专家，负责分析用户提出的故障问题，提供结构化的初步分析结果。"
            "包括识别涉及的云资源、总结问题症状、生成根因假设、建议验证步骤。"
            "确保分析的准确性、完整性和实用性。",
            category="agent",
            key="derisk_agent_problem_analysis_profile_goal",
        ),
        constraints=DynConfig([
            "必须提供结构化的四部分分析结果：对象、症状、初步假设、建议下一步验证",
            "初步假设需要按可能性排序，限制在1-3个",
            "验证建议必须具体可操作，包含明确的检查项目",
            "分析基于问题描述进行，不能添加未提及的信息",
            "输出格式必须严格遵循JSON结构"
        ], category="agent", key="derisk_agent_problem_analysis_constraints"),
        desc=DynConfig(
            "专业的私有云运维问题分析专家，具备丰富的故障诊断经验和结构化分析能力",
            category="agent",
            key="derisk_agent_problem_analysis_profile_desc",
        ),
        examples=DynConfig(
            "示例：分析虚拟机无法启动问题，识别涉及组件为虚拟机和存储，"
            "症状为启动失败，假设为存储空间不足，建议检查磁盘使用率",
            category="agent",
            key="derisk_agent_problem_analysis_examples",
        ),
        system_prompt_template=_PROBLEM_ANALYSIS_SYSTEM_TEMPLATE,
        user_prompt_template=_USER_TEMPLATE,
        write_memory_template=_WRITE_MEMORY_TEMPLATE,
        avatar="problem_analyst.jpg",
    )

    # Agent配置
    language: str = "zh"
    current_goal: str = "私有云故障问题分析"
    max_round: int = 10
    
    # LLM策略配置 - 修复配置错误
    llm_strategy: LLMStrategyType = LLMStrategyType.Default  
    
    # 专业能力配置
    analysis_depth: str = "detailed"  # 分析深度：basic/detailed/comprehensive
    cloud_expertise: List[str] = Field(default_factory=lambda: [
        "虚拟化技术", "网络架构", "存储系统", "容器技术", 
        "数据库运维", "监控告警", "日志分析", "性能优化"
    ])
    
    def __init__(self, **kwargs):
        """创建问题分析Agent实例"""
        super().__init__(**kwargs)
        self._init_actions([ProblemAnalysisAction, CloudResourceAnalysisAction])
        
    def register_variables(self):
        """注册Agent变量"""
        super().register_variables()
        
        @self._vm.register('cloud_components', '云组件知识库')
        def get_cloud_components(instance):
            """获取云组件分类信息"""
            return {
                "计算资源": ["虚拟机", "容器", "裸机服务器"],
                "网络资源": ["虚拟网络", "负载均衡", "防火墙", "路由器"],
                "存储资源": ["块存储", "对象存储", "文件存储", "备份存储"],
                "平台服务": ["数据库", "消息队列", "缓存服务", "监控系统"],
                "管理组件": ["控制节点", "API网关", "认证服务", "调度器"]
            }
        
        @self._vm.register('diagnosis_patterns', '诊断模式库')
        def get_diagnosis_patterns(instance):
            """获取常见故障诊断模式"""
            return {
                "性能问题": {
                    "关键词": ["慢", "卡顿", "响应时间", "超时"],
                    "常见原因": ["资源不足", "配置不当", "网络延迟"],
                    "检查项": ["CPU使用率", "内存使用率", "磁盘IO", "网络带宽"]
                },
                "连接问题": {
                    "关键词": ["无法连接", "连接失败", "网络不通"],
                    "常见原因": ["网络配置", "防火墙规则", "服务未启动"],
                    "检查项": ["网络连通性", "端口状态", "服务状态", "防火墙规则"]
                },
                "启动问题": {
                    "关键词": ["启动失败", "无法启动", "启动异常"],
                    "常见原因": ["配置错误", "依赖缺失", "权限问题"],
                    "检查项": ["配置文件", "依赖服务", "文件权限", "系统日志"]
                }
            }
        
        @self._vm.register('verification_templates', '验证模板库')
        def get_verification_templates(instance):
            """获取验证步骤模板"""
            return {
                "系统资源": [
                    "检查CPU使用率：top, htop命令",
                    "检查内存使用：free -h命令",
                    "检查磁盘使用：df -h, iostat命令",
                    "检查网络状态：netstat, ss命令"
                ],
                "服务状态": [
                    "检查服务运行状态：systemctl status",
                    "查看服务日志：journalctl -u service",
                    "检查进程状态：ps aux | grep",
                    "验证端口监听：netstat -tlnp"
                ],
                "网络诊断": [
                    "测试网络连通性：ping目标地址",
                    "检查路由路径：traceroute",
                    "测试端口连通：telnet host port",
                    "查看网络配置：ip addr, ip route"
                ]
            }


class CloudInfrastructureAnalysisAgent(ConversableAgent):
    """云基础设施专项分析Agent"""
    
    profile: ProfileConfig = ProfileConfig(
        name=DynConfig(
            "CloudInfraAnalysisAgent",
            category="agent", 
            key="derisk_agent_cloud_infra_analysis_profile_name",
        ),
        role=DynConfig(
            "云基础设施分析专家",
            category="agent",
            key="derisk_agent_cloud_infra_analysis_profile_role", 
        ),
        goal=DynConfig(
            "专门分析云基础设施相关问题，包括计算、网络、存储等基础组件的故障诊断",
            category="agent",
            key="derisk_agent_cloud_infra_analysis_profile_goal",
        ),
        desc=DynConfig(
            "云基础设施专家，专注于底层资源和基础服务的问题分析",
            category="agent",
            key="derisk_agent_cloud_infra_analysis_profile_desc",
        ),
        avatar="cloud_infra_analyst.jpg",
    )
    
    def __init__(self, **kwargs):
        """创建云基础设施分析Agent实例"""
        super().__init__(**kwargs)
        self._init_actions([CloudResourceAnalysisAction])
