# OpenDeRisk - AI原生风险智能系统

<div align="center">
  <p>
    <a href="https://github.com/derisk-ai/OpenDerisk">
        <img alt="stars" src="https://img.shields.io/github/stars/derisk-ai/OpenDerisk?style=social" />
    </a>
    <a href="https://github.com/derisk-ai/OpenDerisk">
        <img alt="forks" src="https://img.shields.io/github/forks/derisk-ai/OpenDerisk?style=social" />
    </a>
    <a href="https://opensource.org/licenses/MIT">
      <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
    </a>
     <a href="https://github.com/derisk-ai/OpenDerisk/releases">
      <img alt="Release Notes" src="https://img.shields.io/github/release/derisk-ai/OpenDerisk" />
    </a>
    <a href="https://github.com/derisk-ai/OpenDerisk/issues">
      <img alt="Open Issues" src="https://img.shields.io/github/issues-raw/derisk-ai/OpenDerisk" />
    </a>
    <a href="https://codespaces.new/derisk-ai/OpenDerisk">
      <img alt="Open in GitHub Codespaces" src="https://github.com/codespaces/badge.svg" />
    </a>
  </p>

[**English**](README.md) | [**简体中文**](README.zh.md) | [**视频教程**](https://www.youtube.com/watch?v=1qDIu-Jwdf0)
</div>

## 项目简介

OpenDeRisk是一个AI原生风险智能系统，致力于为每个生产系统提供7×24H的AI数字运维助手(AI-SRE)。我们的愿景是为每个应用系统提供一个7×24H的AI系统数字管家，能够与真人协同工作，全天候处理业务问题，形成深度护航与防护网。

## 核心特性

<p align="left">
  <img src="./assets/feature_zh.png" width="100%" />
</p>

### 🔍 DeepResearch RCA
- 通过深度分析日志、Trace、代码进行问题根因的快速定位
- 支持复杂故障场景的智能诊断与分析

### 📊 可视化证据链
- 定位诊断过程与证据链全部可视化展示
- 诊断过程一目了然，可快速判断定位的准确性

### 🤖 多智能体协同
- **SRE-Agent**: 系统可靠性工程智能体，负责故障诊断规划
- **Code-Agent**: 代码分析智能体，动态编写分析代码
- **ReportAgent**: 报告生成智能体，整理诊断结果
- **Vis-Agent**: 可视化智能体，生成图表和可视化内容

## 🧹 缓存管理

### 清理缓存
系统提供了完整的缓存清理工具：

```bash
# 使用批处理脚本清理所有缓存
scripts\clear_all_cache.bat

# 使用Python脚本清理缓存（更详细的选项）
python scripts/clear_cache.py
python scripts/clear_cache.py --all      # 清理所有缓存包括虚拟环境
python scripts/clear_cache.py --dry-run  # 预览要删除的文件
```

### 禁用缓存功能
系统已配置为禁用页面缓存，确保数据实时性：

```bash
# 应用禁用缓存配置
scripts\apply_no_cache_config.bat
```

**缓存禁用包括：**
- Python字节码缓存（.pyc文件）
- 消息缓存
- 模型缓存
- 知识库缓存
- 向量缓存
- Web页面缓存
- **Data-Agent**: 数据分析智能体，处理遥测数据

### 🏗️ 开源开放架构
- 采用完全开源、开放的方式构建
- 相关框架、代码在开源项目中开箱即用
- 支持自定义Agent和工具扩展

## 系统架构

<p align="left">
  <img src="./assets/arch_zh.png" width="100%" />
</p>

### 技术架构层次

#### 1. 数据层
- 支持拉取Github OpenRCA大规模数据集(26G+)
- 本地数据处理与分析能力
- 支持多种数据源接入

#### 2. 逻辑层
- **Multi-Agent架构**: 多智能体协同工作
- **DeepResearch RCA**: 深度根因分析引擎
- **动态代码生成**: Code-Agent实时编写分析代码

#### 3. 可视化层
- 采用Vis协议动态渲染处理流程
- 完整证据链可视化展示
- 多角色协同切换过程展示

### 前后端技术栈

#### 🔧 后端框架
- **Web框架**: FastAPI - 高性能异步Web框架
- **数据库**: SQLite/PostgreSQL/MySQL - 支持多种数据库
- **向量数据库**: ChromaDB - 用于RAG检索增强生成
- **异步处理**: Uvicorn - ASGI服务器
- **API文档**: 自动生成OpenAPI/Swagger文档
- **中间件**: CORS、异常处理、请求追踪
- **模型服务**: 支持多种LLM提供商集成

**核心后端组件**:
```python
# FastAPI应用结构
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="DERISK Open API",
    description="DERISK Open API",
    version="0.2.0"
)

# 路由模块
- /api/v1 - 聊天接口
- /api/v2 - 聊天接口V2  
- /api/feedback - 反馈接口
- /api/gpts - GPTs应用接口
- /knowledge - 知识库接口
```

#### 🎨 前端框架
- **框架**: Next.js 15.4.2 - React全栈框架
- **UI组件库**: 
  - Ant Design 5.26.6 - 企业级UI设计语言
  - Material-UI 7.3.0 - Google Material Design
- **状态管理**: React Context + Hooks
- **样式方案**: 
  - TailwindCSS 4.0 - 原子化CSS框架
  - Styled-components - CSS-in-JS解决方案
- **图表可视化**:
  - @antv/gpt-vis - GPT可视化组件
  - @antv/g6 - 图可视化引擎
  - ReactFlow - 流程图组件
- **代码编辑**: 
  - CodeMirror - 代码编辑器
  - React-markdown - Markdown渲染
- **国际化**: react-i18next - 多语言支持
- **HTTP客户端**: Axios - API请求库

**前端项目结构**:
```
web/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx      # 全局布局
│   │   └── page.tsx        # 首页
│   ├── components/         # 可复用组件
│   │   ├── layout/         # 布局组件
│   │   ├── chat/          # 聊天组件
│   │   └── common/        # 通用组件
│   ├── contexts/          # React Context
│   │   ├── app-context.tsx
│   │   ├── chat-context.tsx
│   │   └── chat-content-context.tsx
│   ├── hooks/             # 自定义Hooks
│   ├── utils/             # 工具函数
│   └── styles/            # 样式文件
├── public/                # 静态资源
├── package.json          # 依赖配置
└── tsconfig.json         # TypeScript配置
```

**主要前端特性**:
- 🌓 **主题切换**: 支持明暗主题切换
- 🌍 **国际化**: 中英文双语支持
- 📱 **响应式设计**: 适配多种设备尺寸
- 🎯 **实时通信**: Server-Sent Events支持
- 📊 **数据可视化**: 集成多种图表组件
- 🔄 **状态管理**: Context + Hooks模式
- 🎨 **组件化**: 高度模块化的组件架构

#### 🔗 前后端通信
- **API协议**: RESTful API + Server-Sent Events
- **数据格式**: JSON
- **实时通信**: EventSource流式传输
- **文件上传**: 支持多文件上传
- **错误处理**: 统一错误处理机制
- **请求追踪**: 完整的请求链路追踪

### 数字员工(Agent)体系

<p align="left">
  <img src="./assets/ai-agent.png" width="100%" />
</p>

## 环境要求

- **Python**: >= 3.10
- **包管理器**: uv (推荐) 或 pip
- **操作系统**: Windows/Linux/macOS
- **内存**: 建议8GB以上
- **存储**: 建议50GB以上可用空间(用于数据集)

## 快速开始

### 1. 环境准备

#### 安装uv包管理器
```bash
# Linux/macOS
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

#### 克隆项目
```bash
git clone https://github.com/derisk-ai/OpenDerisk.git
cd OpenDerisk
```

### 2. 依赖安装

```bash
uv sync --all-packages --frozen \
--extra "base" \
--extra "proxy_openai" \
--extra "rag" \
--extra "storage_chromadb" \
--extra "derisks" \
--extra "storage_oss2" \
--extra "client" \
--extra "ext_base" \
--index-url=https://pypi.tuna.tsinghua.edu.cn/simple
```

### 3. 配置API密钥

#### 方式一：环境变量配置
```bash
# DeepSeek API配置
export DEEPSEEK_API_KEY="your_deepseek_api_key"

# SiliconFlow API配置  
export SILICONFLOW_API_KEY="your_siliconflow_api_key"
```

#### 方式二：配置文件修改
编辑 `configs/derisk-proxy-deepseek.toml` 文件，配置相应的API密钥。

### 4. 启动服务

```bash
uv run python packages/derisk-app/src/derisk_app/derisk_server.py --config configs/derisk-proxy-deepseek.toml
```

### 5. 访问系统

打开浏览器访问: [http://localhost:7777](http://localhost:7777)

## 使用场景

### 1. AI-SRE(OpenRCA根因定位)

**数据准备**:
- 下载OpenRCA数据集中的[Telecom数据集](https://drive.usercontent.google.com/download?id=1cyOKpqyAP4fy-QiJ6a_cKuwR7D46zyVe&export=download&confirm=t&uuid=42621058-41af-45bf-88a6-64c00bfd2f2e)
- 或使用命令下载:
```bash
gdown https://drive.google.com/uc?id=1cyOKpqyAP4fy-QiJ6a_cKuwR7D46zyVe
```
- 解压数据到 `${项目根目录}/pilot/datasets`

**功能特点**:
- 智能故障诊断与根因分析
- 支持复杂系统的多维度分析
- 可视化诊断过程与结果

### 2. 火焰图助手

- 上传本地应用服务进程的火焰图(Java/Python)
- AI智能分析性能瓶颈
- 提供优化建议

## 开发指南

### Agent开发完整指南

OpenDeRisk采用多智能体架构，每个Agent都是独立的智能体，具备特定的能力和职责。以下是完整的Agent开发指南：

#### 🏗️ Agent架构体系

**核心基类层次**:
```
ConversableAgent (基础对话智能体)
├── PlanningAgent (规划智能体)
├── ReasoningAgent (推理智能体) 
└── 自定义Agent (继承基类实现)
```

**Agent核心组件**:
- **Profile**: 智能体配置文件，定义角色、目标、约束等
- **Action**: 智能体可执行的动作/工具
- **Memory**: 智能体记忆系统
- **Resource**: 智能体所需资源
- **Context**: 运行时上下文

#### 📋 Agent开发步骤

##### 1. 创建Agent基础结构

```python
from derisk.agent.core.base_agent import ConversableAgent
from derisk.agent.core.profile import ProfileConfig, DynConfig
from derisk.agent.core.action.base import Action
from typing import List, Type

class CustomAgent(ConversableAgent):
    """自定义智能体实现"""
    
    # 定义Agent配置文件
    profile: ProfileConfig = ProfileConfig(
        name=DynConfig(
            "CustomAgent",
            category="agent", 
            key="custom_agent_name"
        ),
        role=DynConfig(
            "CustomRole",
            category="agent",
            key="custom_agent_role"
        ),
        goal=DynConfig(
            "智能体的具体目标描述",
            category="agent",
            key="custom_agent_goal"
        ),
        desc=DynConfig(
            "智能体能力描述",
            category="agent", 
            key="custom_agent_desc"
        ),
        system_prompt_template="系统提示词模板",
        user_prompt_template="用户提示词模板",
        avatar="agent_avatar.jpg"
    )
    
    def __init__(self, **kwargs):
        """初始化智能体"""
        super().__init__(**kwargs)
        # 绑定Action
        self._init_actions([CustomAction])
```

##### 2. 定义Agent配置文件(Profile)

```python
# 完整的Profile配置示例
profile: ProfileConfig = ProfileConfig(
    name=DynConfig("DataAnalyst", category="agent", key="data_analyst_name"),
    role=DynConfig("数据分析专家", category="agent", key="data_analyst_role"), 
    goal=DynConfig(
        "分析数据并提供洞察，帮助用户理解数据背后的含义和趋势",
        category="agent", key="data_analyst_goal"
    ),
    constraints=DynConfig([
        "确保数据分析的准确性和可靠性",
        "提供清晰易懂的分析结果",
        "遵循数据隐私和安全规范"
    ], category="agent", key="data_analyst_constraints"),
    desc=DynConfig(
        "专业的数据分析智能体，能够处理各种数据格式并生成分析报告",
        category="agent",
        key="data_analyst_desc"
    ),
    examples=DynConfig(
        "示例：分析销售数据，生成月度报告",
        category="agent", 
        key="data_analyst_examples"
    ),
    system_prompt_template=SYSTEM_TEMPLATE,
    user_prompt_template=USER_TEMPLATE,
    avatar="data_analyst.jpg"
)
```

##### 3. 实现Action(工具/动作)

```python
from derisk.agent.core.action.base import Action, ActionOutput
from derisk._private.pydantic import Field

class CustomAction(Action):
    """自定义动作实现"""
    
    name: str = "custom_action"
    description: str = "执行自定义任务的动作"
    
    async def run(
        self,
        ai_message: str,
        resource: Optional[Resource] = None,
        rely_action_out: Optional[ActionOutput] = None,
        need_vis_render: bool = True,
        **kwargs
    ) -> ActionOutput:
        """执行动作的核心逻辑"""
        try:
            # 实现具体的业务逻辑
            result = await self._execute_business_logic(ai_message, **kwargs)
            
            return ActionOutput(
                is_exe_success=True,
                content=result,
                observations=f"成功执行自定义动作: {result}"
            )
        except Exception as e:
            return ActionOutput(
                is_exe_success=False,
                content=f"执行失败: {str(e)}",
                observations=f"动作执行异常: {str(e)}"
            )
    
    async def _execute_business_logic(self, message: str, **kwargs):
        """实现具体的业务逻辑"""
        # 在这里实现您的具体功能
        return "执行结果"
```

##### 4. 注册变量和资源

```python
def register_variables(self):
    """注册Agent可用的变量"""
    super().register_variables()
    
    @self._vm.register('custom_data', '自定义数据资源')
    async def get_custom_data(instance, context):
        """获取自定义数据"""
        data_resource = context.get("custom_data", None)
        if not data_resource:
            return "暂无数据"
        return data_resource
    
    @self._vm.register('config_info', '配置信息')
    def get_config_info(instance):
        """获取配置信息"""
        return {
            "agent_name": instance.name,
            "agent_role": instance.role,
            "capabilities": ["数据分析", "报告生成"]
        }
```

#### 🎯 专业Agent类型开发

##### 规划型Agent (PlanningAgent)

```python
from derisk.agent.core.plan.planning_agent import PlanningAgent
from derisk.agent.core.plan.planning_action import PlanningAction

class CustomPlanningAgent(PlanningAgent):
    """自定义规划智能体"""
    
    profile: ProfileConfig = ProfileConfig(
        name=DynConfig("TaskPlanner", category="agent", key="task_planner_name"),
        role=DynConfig("任务规划专家", category="agent", key="task_planner_role"),
        goal=DynConfig(
            "分析复杂任务并制定执行计划，协调其他智能体完成目标",
            category="agent", key="task_planner_goal"
        ),
        system_prompt_template=PLANNING_TEMPLATE,
        avatar="planner.jpg"
    )
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._init_actions([PlanningAction])
    
    def hire(self, agents: List[ConversableAgent]):
        """雇佣其他智能体"""
        self.agents = agents
```

##### 推理型Agent (ReasoningAgent)

```python
from derisk_ext.agent.agents.reasoning.default.reasoning_agent import ReasoningAgent

class CustomReasoningAgent(ReasoningAgent):
    """自定义推理智能体"""
    
    profile: ProfileConfig = ProfileConfig(
        name=DynConfig("LogicReasoner", category="agent", key="logic_reasoner_name"),
        role=DynConfig("逻辑推理专家", category="agent", key="logic_reasoner_role"),
        goal=DynConfig(
            "基于给定信息进行逻辑推理，得出合理结论",
            category="agent", key="logic_reasoner_goal"
        )
    )
    
    def register_variables(self):
        super().register_variables()
        # 注册推理相关的变量和工具
```

#### 🔧 Agent工具开发

##### Local Tool开发

```python
from derisk.agent.core.action.base import Action, ActionOutput

class DataProcessingTool(Action):
    """数据处理工具"""
    
    name: str = "data_processing"
    description: str = "处理和分析数据"
    
    async def run(self, ai_message: str, **kwargs) -> ActionOutput:
        """数据处理逻辑"""
        try:
            # 解析输入参数
            data = kwargs.get('data', [])
            operation = kwargs.get('operation', 'analyze')
            
            # 执行数据处理
            if operation == "statistical":
                result = self._analyze_data(data)
            elif operation == "transform":
                result = self._transform_data(data)
            else:
                raise ValueError(f"不支持的操作: {operation}")
            
            return ActionOutput(
                is_exe_success=True,
                content=str(result),
                observations=f"数据处理完成，操作类型: {operation}"
            )
        except Exception as e:
            logger.error(f"数据处理失败: {str(e)}")
            return ActionOutput(
                is_exe_success=False,
                content=f"处理失败: {str(e)}"
            )
    
    def _analyze_data(self, data):
        """数据分析逻辑"""
        return {"count": len(data), "summary": "数据分析结果"}
    
    def _transform_data(self, data):
        """数据转换逻辑"""
        return [item.upper() if isinstance(item, str) else item for item in data]
```

##### MCP服务集成

```python
# MCP服务配置示例
class MCPServiceAgent(ConversableAgent):
    """集成MCP服务的智能体"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._init_mcp_services()
    
    def _init_mcp_services(self):
        """初始化MCP服务"""
        # 配置MCP服务连接
        mcp_config = {
            "service_name": "custom_mcp_service",
            "endpoint": "http://localhost:8080/mcp",
            "capabilities": ["data_query", "file_processing"]
        }
        # 注册MCP服务
        self._register_mcp_service(mcp_config)
```

#### 📝 完整开发示例

以下是一个完整的数据分析Agent示例：

```python
import logging
from typing import Optional, List, Type
from derisk.agent.core.base_agent import ConversableAgent
from derisk.agent.core.profile import ProfileConfig, DynConfig
from derisk.agent.core.action.base import Action, ActionOutput
from derisk.agent.resource.base import Resource

logger = logging.getLogger(__name__)

# 系统提示词模板
SYSTEM_TEMPLATE = """你是一个专业的数据分析师，名为{{name}}。
你的目标是：{{goal}}

## 分析规则：
1. 仔细分析提供的数据
2. 识别数据中的模式和趋势
3. 提供清晰的分析结论
4. 生成可视化建议

## 约束条件：
{{constraints}}

请根据用户的需求进行专业的数据分析。
"""

USER_TEMPLATE = """请分析以下数据：{{question}}"""

class DataAnalysisAction(Action):
    """数据分析动作"""
    
    name: str = "data_analysis"
    description: str = "执行数据分析任务"
    
    async def run(
        self,
        ai_message: str,
        resource: Optional[Resource] = None,
        **kwargs
    ) -> ActionOutput:
        """数据分析逻辑"""
        try:
            # 解析AI消息中的分析指令
            analysis_type = self._extract_analysis_type(ai_message)
            data_source = kwargs.get('data_source', None)
            
            # 执行数据分析
            if analysis_type == "statistical":
                result = await self._statistical_analysis(data_source)
            elif analysis_type == "trend":
                result = await self._trend_analysis(data_source)
            else:
                result = await self._general_analysis(data_source)
            
            return ActionOutput(
                is_exe_success=True,
                content=result,
                observations=f"完成{analysis_type}分析"
            )
        except Exception as e:
            logger.error(f"数据分析失败: {str(e)}")
            return ActionOutput(
                is_exe_success=False,
                content=f"分析失败: {str(e)}"
            )
    
    def _extract_analysis_type(self, message: str) -> str:
        """从消息中提取分析类型"""
        if "统计" in message or "statistical" in message.lower():
            return "statistical"
        elif "趋势" in message or "trend" in message.lower():
            return "trend"
        return "general"
    
    async def _statistical_analysis(self, data_source):
        """统计分析"""
        return "统计分析结果：均值、方差、分布等"
    
    async def _trend_analysis(self, data_source):
        """趋势分析"""
        return "趋势分析结果：上升/下降趋势、周期性等"
    
    async def _general_analysis(self, data_source):
        """通用分析"""
        return "通用分析结果：数据概览、关键指标等"

class DataAnalysisAgent(ConversableAgent):
    """数据分析智能体"""
    
    profile: ProfileConfig = ProfileConfig(
        name=DynConfig(
            "DataAnalyst",
            category="agent",
            key="data_analysis_agent_name"
        ),
        role=DynConfig(
            "数据分析专家",
            category="agent", 
            key="data_analysis_agent_role"
        ),
        goal=DynConfig(
            "分析各种类型的数据，识别模式和趋势，提供有价值的洞察",
            category="agent",
            key="data_analysis_agent_goal"
        ),
        constraints=DynConfig([
            "确保分析结果的准确性和可靠性",
            "提供清晰易懂的分析报告",
            "遵循数据隐私保护原则"
        ], category="agent", key="data_analysis_agent_constraints"),
        desc=DynConfig(
            "专业的数据分析智能体，能够处理结构化和非结构化数据",
            category="agent",
            key="data_analysis_agent_desc"
        ),
        system_prompt_template=SYSTEM_TEMPLATE,
        user_prompt_template=USER_TEMPLATE,
        avatar="data_analyst.jpg"
    )
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._init_actions([DataAnalysisAction])
    
    def register_variables(self):
        super().register_variables()
        
        @self._vm.register('analysis_config', '分析配置信息')
        def get_analysis_config(instance):
            return {
                "supported_formats": ["csv", "json", "excel"],
                "analysis_types": ["statistical", "trend", "correlation"],
                "visualization_options": ["chart", "graph", "table"]
            }

# 使用示例
async def create_data_analysis_agent():
    """创建数据分析智能体实例"""
    from derisk.agent import AgentContext, LLMConfig, AgentMemory
    
    # 创建Agent上下文
    context = AgentContext(
        conv_id="data_analysis_001",
        gpts_app_name="数据分析助手"
    )
    
    # 创建LLM配置
    llm_config = LLMConfig(llm_client=your_llm_client)
    
    # 创建Agent内存
    memory = AgentMemory()
    
    # 构建Agent
    agent = await (DataAnalysisAgent()
                  .bind(context)
                  .bind(llm_config) 
                  .bind(memory)
                  .build())
    
    return agent
```

#### 🚀 Agent部署和使用

##### 1. 注册Agent到系统

```python
# 在应用初始化时注册Agent
from derisk_app.component_configs import register_agent

def register_custom_agents():
    """注册自定义智能体"""
    register_agent("data_analysis", DataAnalysisAgent)
    register_agent("custom_planning", CustomPlanningAgent)
```

##### 2. 在对话中使用Agent

```python
async def use_agent_in_conversation():
    """在对话中使用智能体"""
    # 创建Agent实例
    agent = await create_data_analysis_agent()
    
    # 发送消息给Agent
    from derisk.agent.core.agent import AgentMessage
    
    message = AgentMessage.init_new(
        content="请分析这组销售数据的趋势",
        current_goal="数据趋势分析"
    )
    
    # Agent处理消息并返回结果
    response = await agent.generate_reply(
        received_message=message,
        sender=user_agent
    )
    
    return response
```

#### 📚 最佳实践

1. **模块化设计**: 将复杂功能拆分为多个Action
2. **错误处理**: 完善的异常处理和错误恢复机制
3. **资源管理**: 合理管理Agent使用的资源
4. **性能优化**: 避免阻塞操作，使用异步处理
5. **测试覆盖**: 为Agent和Action编写单元测试
6. **文档完善**: 详细的代码注释和使用文档

通过以上指南，您可以开发出功能强大、稳定可靠的智能体，为OpenDeRisk系统增加新的能力。

### 工具开发
```
