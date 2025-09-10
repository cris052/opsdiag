"""Problem Analysis Action for private cloud operations troubleshooting."""

import logging
from typing import Optional, Dict, Any, List
import json
import asyncio
from datetime import datetime

from opsdiag._private.pydantic import Field
from opsdiag.agent.core.action.base import Action, ActionOutput
from opsdiag.agent.resource.base import Resource

logger = logging.getLogger(__name__)


class ProblemAnalysisAction(Action):
    """私有云运维故障问题分析动作"""
    
    name: str = "problem_analysis"
    description: str = "分析私有云运维故障问题，提供结构化的初步分析结果"
    
    async def run(
        self,
        ai_message: str,
        resource: Optional[Resource] = None,
        rely_action_out: Optional[ActionOutput] = None,
        need_vis_render: bool = True,
        **kwargs
    ) -> ActionOutput:
        """执行问题分析"""
        try:
            # 提取用户问题描述
            user_problem = kwargs.get('user_problem', ai_message)
            
            # 执行结构化分析
            analysis_result = await self._analyze_problem(user_problem)
            
            return ActionOutput(
                is_exe_success=True,
                content=json.dumps(analysis_result, ensure_ascii=False, indent=2),
                observations=f"完成私有云故障问题分析，识别对象: {analysis_result['对象']}, 症状: {analysis_result['症状'][:50]}..."
            )
            
        except Exception as e:
            logger.error(f"问题分析失败: {str(e)}")
            return ActionOutput(
                is_exe_success=False,
                content=f"分析失败: {str(e)}",
                observations=f"执行问题分析时发生错误: {str(e)}"
            )
    
    async def _analyze_problem(self, user_problem: str) -> Dict[str, Any]:
        """分析用户问题并返回结构化结果"""
        logger.info("开始分析私有云故障问题")
        
        # 模拟异步分析处理
        await asyncio.sleep(0.1)
        
        # 基于问题内容进行智能分析
        analysis = self._extract_problem_components(user_problem)
        
        return {
            "分析时间": datetime.now().isoformat(),
            "原始问题": user_problem,
            "对象": analysis["objects"],
            "症状": analysis["symptoms"], 
            "初步假设": analysis["hypotheses"],
            "建议下一步验证": analysis["next_steps"]
        }
    
    def _extract_problem_components(self, problem_text: str) -> Dict[str, Any]:
        """从问题描述中提取关键组件"""
        problem_lower = problem_text.lower()
        
        # 识别涉及的云资源或组件
        objects = self._identify_cloud_objects(problem_lower)
        
        # 提取症状描述
        symptoms = self._extract_symptoms(problem_text)
        
        # 生成初步假设
        hypotheses = self._generate_hypotheses(problem_lower, objects)
        
        # 建议验证步骤
        next_steps = self._suggest_verification_steps(objects, symptoms)
        
        return {
            "objects": objects,
            "symptoms": symptoms,
            "hypotheses": hypotheses,
            "next_steps": next_steps
        }
    
    def _identify_cloud_objects(self, problem_text: str) -> List[str]:
        """识别涉及的云资源或组件"""
        cloud_components = {
            "虚拟机": ["虚拟机", "vm", "实例", "instance", "服务器"],
            "网络": ["网络", "network", "网卡", "ip", "连接", "ping", "端口"],
            "存储": ["存储", "storage", "磁盘", "disk", "卷", "volume", "文件系统"],
            "容器": ["容器", "container", "docker", "pod", "kubernetes", "k8s"],
            "控制节点": ["控制节点", "controller", "master", "管理节点"],
            "数据库": ["数据库", "database", "mysql", "postgresql", "redis"],
            "负载均衡": ["负载均衡", "load balancer", "lb", "nginx", "haproxy"],
            "监控系统": ["监控", "monitor", "prometheus", "grafana", "zabbix"],
            "日志系统": ["日志", "log", "elasticsearch", "kibana", "fluentd"]
        }
        
        identified_objects = []
        for component, keywords in cloud_components.items():
            if any(keyword in problem_text for keyword in keywords):
                identified_objects.append(component)
        
        # 如果没有明确识别到组件，返回通用分类
        if not identified_objects:
            if any(keyword in problem_text for keyword in ["服务", "应用", "系统"]):
                identified_objects.append("应用服务")
            else:
                identified_objects.append("待确定组件")
        
        return identified_objects
    
    def _extract_symptoms(self, problem_text: str) -> str:
        """提取症状描述"""
        # 移除多余空格并保留原始描述
        symptoms = " ".join(problem_text.split())
        
        # 如果描述过长，截取关键部分
        if len(symptoms) > 200:
            symptoms = symptoms[:200] + "..."
        
        return symptoms
    
    def _generate_hypotheses(self, problem_text: str, objects: List[str]) -> List[Dict[str, Any]]:
        """生成初步假设"""
        hypotheses = []
        
        # 基于问题关键词和涉及组件生成假设
        if any(keyword in problem_text for keyword in ["无法连接", "连接超时", "网络", "ping"]):
            hypotheses.append({
                "假设": "网络连通性问题",
                "可能性": "高",
                "描述": "网络配置错误、防火墙阻断或网络设备故障"
            })
        
        if any(keyword in problem_text for keyword in ["慢", "卡顿", "响应", "性能"]):
            hypotheses.append({
                "假设": "性能瓶颈",
                "可能性": "高", 
                "描述": "CPU、内存、磁盘IO或网络带宽不足"
            })
        
        if any(keyword in problem_text for keyword in ["无法启动", "启动失败", "服务异常"]):
            hypotheses.append({
                "假设": "服务配置问题",
                "可能性": "中",
                "描述": "配置文件错误、依赖服务未启动或权限问题"
            })
        
        if any(keyword in problem_text for keyword in ["磁盘", "存储", "空间"]):
            hypotheses.append({
                "假设": "存储资源不足",
                "可能性": "中",
                "描述": "磁盘空间不足、存储设备故障或文件系统错误"
            })
        
        # 如果没有生成特定假设，添加通用假设
        if not hypotheses:
            hypotheses.extend([
                {
                    "假设": "配置问题",
                    "可能性": "中",
                    "描述": "系统或应用配置不当导致的功能异常"
                },
                {
                    "假设": "资源不足",
                    "可能性": "中", 
                    "描述": "CPU、内存或存储资源不足影响正常运行"
                },
                {
                    "假设": "环境变化",
                    "可能性": "低",
                    "描述": "近期系统更新、补丁安装或环境变更引起"
                }
            ])
        
        # 按可能性排序并限制数量
        hypotheses.sort(key=lambda x: {"高": 3, "中": 2, "低": 1}[x["可能性"]], reverse=True)
        return hypotheses[:3]
    
    def _suggest_verification_steps(self, objects: List[str], symptoms: str) -> List[Dict[str, str]]:
        """建议验证步骤"""
        steps = []
        
        # 基于涉及的组件建议相应的验证步骤
        if "虚拟机" in objects:
            steps.extend([
                {"类型": "监控指标", "内容": "检查虚拟机CPU、内存、磁盘使用率"},
                {"类型": "系统日志", "内容": "查看/var/log/messages和dmesg输出"}
            ])
        
        if "网络" in objects:
            steps.extend([
                {"类型": "网络测试", "内容": "执行ping、telnet、traceroute测试"},
                {"类型": "网络配置", "内容": "检查网卡配置、路由表、防火墙规则"}
            ])
        
        if "存储" in objects:
            steps.extend([
                {"类型": "存储状态", "内容": "检查磁盘使用率、IO性能、文件系统状态"},
                {"类型": "存储日志", "内容": "查看存储相关的系统日志和错误信息"}
            ])
        
        if "容器" in objects:
            steps.extend([
                {"类型": "容器状态", "内容": "检查容器运行状态、资源使用情况"},
                {"类型": "容器日志", "内容": "查看容器日志和Kubernetes事件"}
            ])
        
        if "数据库" in objects:
            steps.extend([
                {"类型": "数据库状态", "内容": "检查数据库连接数、锁等待、慢查询"},
                {"类型": "数据库日志", "内容": "查看数据库错误日志和性能日志"}
            ])
        
        # 通用验证步骤
        if not steps:
            steps.extend([
                {"类型": "系统状态", "内容": "检查系统整体资源使用情况"},
                {"类型": "应用日志", "内容": "查看相关应用的运行日志"},
                {"类型": "监控数据", "内容": "收集问题发生时间段的监控指标"}
            ])
        
        return steps[:5]  # 限制建议数量


class CloudResourceAnalysisAction(Action):
    """云资源专项分析动作"""
    
    name: str = "cloud_resource_analysis"
    description: str = "专门分析云资源相关的问题"
    
    async def run(
        self,
        ai_message: str,
        resource: Optional[Resource] = None,
        **kwargs
    ) -> ActionOutput:
        """执行云资源分析"""
        try:
            resource_type = kwargs.get('resource_type', 'unknown')
            resource_id = kwargs.get('resource_id', '')
            
            analysis_result = await self._analyze_cloud_resource(resource_type, resource_id, ai_message)
            
            return ActionOutput(
                is_exe_success=True,
                content=json.dumps(analysis_result, ensure_ascii=False, indent=2),
                observations=f"完成{resource_type}资源分析"
            )
            
        except Exception as e:
            logger.error(f"云资源分析失败: {str(e)}")
            return ActionOutput(
                is_exe_success=False,
                content=f"分析失败: {str(e)}"
            )
    
    async def _analyze_cloud_resource(self, resource_type: str, resource_id: str, problem: str) -> Dict[str, Any]:
        """分析特定云资源"""
        await asyncio.sleep(0.1)
        
        return {
            "资源类型": resource_type,
            "资源ID": resource_id,
            "问题描述": problem,
            "分析时间": datetime.now().isoformat(),
            "资源状态": "需要进一步检查",
            "建议操作": [
                f"检查{resource_type}的配置信息",
                f"查看{resource_type}的运行日志",
                f"验证{resource_type}的网络连通性"
            ]
        }
