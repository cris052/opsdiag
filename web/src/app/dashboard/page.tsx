'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Progress, Table, Button, Select, Tag, Modal, message, Statistic 
} from 'antd';
import { 
  DashboardOutlined, 
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';

const { Option } = Select;

// 模拟数据
const mockData = {
  systemStatus: {
    uptime: '99.98%',
    status: 'normal',
    lastCheck: '2分钟前'
  },
  services: {
    total: 156,
    abnormal: 2,
    running: 154
  },
  alerts: [
    { id: 1, type: 'warning', message: 'CPU使用率过高', time: '5分钟前', severity: 'medium' },
    { id: 2, type: 'error', message: '数据库连接异常', time: '10分钟前', severity: 'high' },
    { id: 3, type: 'info', message: '系统更新完成', time: '1小时前', severity: 'low' }
  ],
  performance: {
    cpu: 75,
    memory: 68,
    disk: 45,
    network: 32
  },
  quickActions: [
    { id: 1, name: '系统重启', icon: 'fa-power-off', color: 'red' },
    { id: 2, name: '数据备份', icon: 'fa-database', color: 'blue' },
    { id: 3, name: '日志查看', icon: 'fa-file-alt', color: 'green' },
    { id: 4, name: '性能报告', icon: 'fa-chart-line', color: 'purple' },
    { id: 5, name: '告警管理', icon: 'fa-bell', color: 'orange' },
    { id: 6, name: '系统设置', icon: 'fa-cog', color: 'gray' }
  ],
  activities: [
    { id: 1, type: 'info', message: '用户登录系统', time: '2分钟前', user: 'admin' },
    { id: 2, type: 'warning', message: 'CPU使用率达到80%', time: '5分钟前', user: 'system' },
    { id: 3, type: 'success', message: '数据备份完成', time: '10分钟前', user: 'system' },
    { id: 4, type: 'error', message: '数据库连接失败', time: '15分钟前', user: 'system' }
  ]
};

const projectTypes = [
  { id: 1, name: '微服务架构', description: '分布式微服务系统' },
  { id: 2, name: '单体应用', description: '传统单体架构应用' },
  { id: 3, name: '容器化应用', description: 'Docker容器化部署' },
  { id: 4, name: '云原生应用', description: 'Kubernetes云原生' }
];

const regions = [
  { id: 1, name: '华东-1', status: 'normal' },
  { id: 2, name: '华北-2', status: 'normal' },
  { id: 3, name: '华南-1', status: 'warning' },
  { id: 4, name: '西南-1', status: 'normal' }
];

export default function DashboardPage() {
  const [selectedProjectType, setSelectedProjectType] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [realTimeData, setRealTimeData] = useState(mockData);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [showSystemIcon, setShowSystemIcon] = useState(false);
  const [showServiceIcon, setShowServiceIcon] = useState(false);
  const [showResourceIcon, setShowResourceIcon] = useState(false);
  const [chartModalVisible, setChartModalVisible] = useState(false);
  const [chartTitle, setChartTitle] = useState('');
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartType, setChartType] = useState('');

  // 服务状态数据
  const serviceData = [
    {
      id: 1,
      name: '主数据库服务',
      version: 'PostgreSQL 13.4',
      status: 'running',
      lastCheck: '1分钟前',
      icon: 'fas fa-database',
      iconColor: 'bg-primary/10 text-primary'
    },
    {
      id: 2,
      name: 'API网关服务',
      version: 'Kong 2.8.1',
      status: 'running',
      lastCheck: '3分钟前',
      icon: 'fas fa-cloud',
      iconColor: 'bg-blue-500/10 text-blue-500'
    },
    {
      id: 3,
      name: '消息队列服务',
      version: 'RabbitMQ 3.9.7',
      status: 'error',
      lastCheck: '刚刚',
      icon: 'fas fa-message',
      iconColor: 'bg-purple-500/10 text-purple-500'
    },
    {
      id: 4,
      name: '安全防护服务',
      version: 'Nginx 1.20.2',
      status: 'running',
      lastCheck: '5分钟前',
      icon: 'fas fa-shield-alt',
      iconColor: 'bg-green-500/10 text-green-500'
    },
    {
      id: 5,
      name: '监控服务',
      version: 'Prometheus 2.35.0',
      status: 'running',
      lastCheck: '8分钟前',
      icon: 'fas fa-chart-line',
      iconColor: 'bg-orange-500/10 text-orange-500'
    },
    {
      id: 6,
      name: '缓存服务',
      version: 'Redis 6.2.6',
      status: 'running',
      lastCheck: '2分钟前',
      icon: 'fas fa-memory',
      iconColor: 'bg-red-500/10 text-red-500'
    },
    {
      id: 7,
      name: '搜索引擎服务',
      version: 'Elasticsearch 7.15.2',
      status: 'running',
      lastCheck: '4分钟前',
      icon: 'fas fa-search',
      iconColor: 'bg-yellow-500/10 text-yellow-500'
    },
    {
      id: 8,
      name: '文件存储服务',
      version: 'MinIO 2021.10.23',
      status: 'error',
      lastCheck: '刚刚',
      icon: 'fas fa-folder',
      iconColor: 'bg-indigo-500/10 text-indigo-500'
    },
    {
      id: 9,
      name: '日志收集服务',
      version: 'Logstash 7.15.2',
      status: 'running',
      lastCheck: '6分钟前',
      icon: 'fas fa-file-alt',
      iconColor: 'bg-teal-500/10 text-teal-500'
    },
    {
      id: 10,
      name: '配置中心服务',
      version: 'Nacos 2.0.4',
      status: 'running',
      lastCheck: '7分钟前',
      icon: 'fas fa-cogs',
      iconColor: 'bg-pink-500/10 text-pink-500'
    },
    {
      id: 11,
      name: '任务调度服务',
      version: 'XXL-Job 2.3.0',
      status: 'running',
      lastCheck: '9分钟前',
      icon: 'fas fa-clock',
      iconColor: 'bg-cyan-500/10 text-cyan-500'
    },
    {
      id: 12,
      name: '链路追踪服务',
      version: 'Jaeger 1.28.0',
      status: 'error',
      lastCheck: '1分钟前',
      icon: 'fas fa-route',
      iconColor: 'bg-lime-500/10 text-lime-500'
    }
  ];

  // 实时数据更新
  useEffect(() => {
    const interval = setInterval(() => {
      // 模拟实时数据变化
      setRealTimeData(prev => ({
        ...prev,
        performance: {
          cpu: Math.max(30, Math.min(90, prev.performance.cpu + (Math.random() - 0.5) * 10)),
          memory: Math.max(40, Math.min(85, prev.performance.memory + (Math.random() - 0.5) * 8)),
          disk: Math.max(20, Math.min(80, prev.performance.disk + (Math.random() - 0.5) * 5)),
          network: Math.max(10, Math.min(70, prev.performance.network + (Math.random() - 0.5) * 15))
        }
      }));
      setLastUpdateTime(new Date());
    }, 5000); // 每5秒更新一次

    return () => clearInterval(interval);
  }, []);

  // 快速操作处理
  const handleQuickAction = (actionName: string) => {
    switch (actionName) {
      case '系统重启':
        Modal.confirm({
          title: '确认重启',
          content: '确定要重启系统吗？这将中断所有正在运行的服务。',
          onOk: () => {
            message.success('系统重启命令已发送，请稍候...');
          }
        });
        break;
      case '数据备份':
        message.info('数据备份功能正在开发中，敬请期待！');
        break;
      default:
        message.info('功能开发中...');
    }
  };

  // 刷新数据
  const handleRefresh = () => {
    setRefreshing(true);
    // 重新获取数据并更新状态
    setRealTimeData({
      ...mockData,
      performance: {
        cpu: Math.floor(Math.random() * 40) + 50,
        memory: Math.floor(Math.random() * 30) + 60,
        disk: Math.floor(Math.random() * 40) + 30,
        network: Math.floor(Math.random() * 50) + 20
      }
    });
    setLastUpdateTime(new Date());
    setTimeout(() => {
      setRefreshing(false);
      message.success('数据已刷新');
    }, 1000);
  };

  // 显示详细信息模态框
  const showDetailModal = (title: string, content: React.ReactNode) => {
    setModalTitle(title);
    setModalContent(content);
    setModalVisible(true);
  };

  // 生成模拟时序数据
  const generateTimeSeriesData = (type: string) => {
    const now = new Date();
    const data = [];
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      const timeStr = time.getHours().toString().padStart(2, '0') + ':00';
      
      let value;
      switch (type) {
        case 'system':
          // 系统运行时间百分比
          value = 99.5 + Math.random() * 0.5;
          break;
        case 'service':
          // 服务响应时间 (ms)
          value = 100 + Math.random() * 50 + Math.sin(i * 0.5) * 20;
          break;
        case 'resource':
          // 资源使用率 (%)
          value = 60 + Math.random() * 20 + Math.sin(i * 0.3) * 15;
          break;
        default:
          value = Math.random() * 100;
      }
      
      data.push({
        time: timeStr,
        value: Math.round(value * 100) / 100
      });
    }
    return data;
  };

  // 显示折线图模态框
  const showChartModal = (title: string, type: string) => {
    const data = generateTimeSeriesData(type);
    setChartTitle(title);
    setChartData(data);
    setChartType(type);
    setChartModalVisible(true);
  };

  // 简单的SVG折线图组件
  const SimpleLineChart = ({ data, width = 520, height = 220 }: { data: any[], width?: number, height?: number }) => {
    if (!data || data.length === 0) return null;

    const padding = { top: 25, right: 25, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const valueRange = maxValue - minValue || 1;

    // 生成平滑曲线路径点
    const points = data.map((d, i) => {
      const x = padding.left + (i / (data.length - 1)) * chartWidth;
      const y = padding.top + ((maxValue - d.value) / valueRange) * chartHeight;
      return { x, y, value: d.value, time: d.time };
    });

    // 创建平滑曲线路径
    const createSmoothPath = (points: any[]) => {
      if (points.length < 2) return '';
      
      let path = `M ${points[0].x} ${points[0].y}`;
      
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const next = points[i + 1];
        
        if (i === 1) {
          // 第一个控制点
          const cp1x = prev.x + (curr.x - prev.x) * 0.3;
          const cp1y = prev.y;
          const cp2x = curr.x - (curr.x - prev.x) * 0.3;
          const cp2y = curr.y;
          path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
        } else {
          // 中间和最后的控制点
          const cp1x = prev.x + (curr.x - (points[i - 2]?.x || prev.x)) * 0.15;
          const cp1y = prev.y + (curr.y - (points[i - 2]?.y || prev.y)) * 0.15;
          const cp2x = curr.x - (next ? (next.x - prev.x) * 0.15 : (curr.x - prev.x) * 0.3);
          const cp2y = curr.y - (next ? (next.y - prev.y) * 0.15 : 0);
          path += ` S ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
        }
      }
      
      return path;
    };

    const pathD = createSmoothPath(points);

    // 生成柔和的网格线
    const gridLines = [];
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (i / 4) * chartHeight;
      gridLines.push(
        <line
          key={`grid-${i}`}
          x1={padding.left}
          y1={y}
          x2={padding.left + chartWidth}
          y2={y}
          stroke="#f8fafc"
          strokeWidth="1"
          strokeDasharray="2,4"
        />
      );
    }

    return (
      <div className="w-full max-w-full overflow-hidden">
        <svg width={width} height={height} className="rounded-xl bg-gradient-to-br from-slate-50 to-blue-50 shadow-inner max-w-full">
          {/* 网格线 */}
          {gridLines}
          
          {/* 渐变定义 */}
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/> 
              </feMerge>
            </filter>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1e40af" floodOpacity="0.1"/>
            </filter>
          </defs>
          
          {/* 面积填充 */}
          <path
            d={`${pathD} L ${padding.left + chartWidth} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`}
            fill="url(#areaGradient)"
            filter="url(#shadow)"
          />
          
          {/* 折线 */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            className="drop-shadow-sm"
          />
          
          {/* 数据点 */}
          {points.map((point, i) => {
            return (
              <g key={i}>
                {/* 外圈光晕 */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="8"
                  fill="#3b82f6"
                  fillOpacity="0.1"
                  className="opacity-0 hover:opacity-100 transition-opacity duration-300"
                />
                {/* 主数据点 */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill="#ffffff"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  filter="url(#shadow)"
                  className="hover:r-5 hover:stroke-blue-500 transition-all duration-200 cursor-pointer"
                >
                  <title>{`${point.time}: ${point.value}${chartType === 'service' ? 'ms' : '%'}`}</title>
                </circle>
                {/* 内核点 */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="1.5"
                  fill="#3b82f6"
                  className="pointer-events-none"
                />
              </g>
            );
          })}
          
          {/* Y轴标签 */}
          {[0, 1, 2, 3, 4].map(i => {
            const y = padding.top + (i / 4) * chartHeight;
            const value = maxValue - (i / 4) * valueRange;
            return (
              <text
                key={`y-label-${i}`}
                x={padding.left - 15}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#64748b"
                fontWeight="500"
              >
                {Math.round(value * 10) / 10}
              </text>
            );
          })}
          
          {/* X轴标签 */}
          {data.filter((_, i) => i % 4 === 0).map((d, i) => {
            const originalIndex = i * 4;
            const x = padding.left + (originalIndex / (data.length - 1)) * chartWidth;
            return (
              <text
                key={`x-label-${i}`}
                x={x}
                y={height - 15}
                textAnchor="middle"
                fontSize="11"
                fill="#64748b"
                fontWeight="500"
              >
                {d.time}
              </text>
            );
          })}
          
          {/* Y轴线 */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={padding.top + chartHeight}
            stroke="#e2e8f0"
            strokeWidth="2"
          />
          
          {/* X轴线 */}
          <line
            x1={padding.left}
            y1={padding.top + chartHeight}
            x2={padding.left + chartWidth}
            y2={padding.top + chartHeight}
            stroke="#e2e8f0"
            strokeWidth="2"
          />
        </svg>
      </div>
    );
  };

  // 服务监控相关函数
  const showStorageServiceDetails = () => {
    const content = (
      <div className="space-y-4">
        {/* 总结信息 */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
          <h4 className="text-base font-semibold text-green-800 mb-2 flex items-center">
            <i className="fas fa-check-circle text-green-600 mr-2"></i>
            服务总结
          </h4>
          <p className="text-sm text-green-800">存储服务运行正常，所有设备状态良好，建议定期清理缓存。</p>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <h4 className="text-base font-semibold text-blue-800 mb-3 flex items-center">
            <i className="fas fa-database text-blue-600 mr-2"></i>
            性能指标
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <div className="text-xs font-medium text-gray-600 mb-1">磁盘使用率</div>
              <div className="text-lg font-bold text-blue-600">45%</div>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <div className="text-xs font-medium text-gray-600 mb-1">IOPS</div>
              <div className="text-lg font-bold text-green-600">2.3K</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
            <i className="fas fa-hdd text-gray-600 mr-2"></i>
            设备状态
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg">
              <span className="text-xs font-medium text-gray-700">主存储</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">正常</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg">
              <span className="text-xs font-medium text-gray-700">备份存储</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">正常</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg">
              <span className="text-xs font-medium text-gray-700">缓存存储</span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">高使用率</span>
            </div>
          </div>
        </div>
      </div>
    );
    showDetailModal('存储服务详情', content);
  };

  const showMiddlewareServiceDetails = () => {
    const content = (
      <div className="flex gap-4">
        {/* 左侧服务列表 */}
        <div className="flex-1">
          <h4 className="text-base font-semibold text-purple-600 mb-3">正常运行服务</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
              <span className="text-xs font-medium">Redis缓存服务</span>
              <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">运行中</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
              <span className="text-xs font-medium">RabbitMQ消息队列</span>
              <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">运行中</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
              <span className="text-xs font-medium">Nginx负载均衡</span>
              <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">运行中</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
              <span className="text-xs font-medium">Elasticsearch搜索</span>
              <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">运行中</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
              <span className="text-xs font-medium">Zookeeper协调</span>
              <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">运行中</span>
            </div>
          </div>
        </div>
        
        {/* 右侧状态信息 */}
        <div className="w-72">
          <h4 className="text-base font-semibold text-gray-700 mb-3">服务状态良好</h4>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-check text-white text-lg"></i>
            </div>
            <p className="text-gray-600 text-xs mb-2">所有中间件服务运行正常</p>
            <div className="mt-3 space-y-1 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>活跃连接:</span>
                <span className="font-medium">1,245</span>
              </div>
              <div className="flex justify-between">
                <span>处理请求/秒:</span>
                <span className="font-medium">856</span>
              </div>
              <div className="flex justify-between">
                <span>平均响应时间:</span>
                <span className="font-medium">125ms</span>
              </div>
              <div className="flex justify-between">
                <span>错误率:</span>
                <span className="font-medium">0.02%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
    showDetailModal('中间件服务详情', content);
  };

  const showComputeServiceDetails = () => {
    const content = (
      <div className="space-y-4">
        {/* 总结信息 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
          <h4 className="text-base font-semibold text-blue-800 mb-2 flex items-center">
            <i className="fas fa-info-circle text-blue-600 mr-2"></i>
            服务总结
          </h4>
          <p className="text-sm text-blue-800">计算服务整体运行正常，但节点-03存在异常，建议立即处理。</p>
        </div>
        
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
          <h4 className="text-base font-semibold text-orange-800 mb-3 flex items-center">
            <i className="fas fa-microchip text-orange-600 mr-2"></i>
            性能指标
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <div className="text-xs font-medium text-gray-600 mb-1">CPU使用率</div>
              <div className="text-lg font-bold text-orange-600">72%</div>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <div className="text-xs font-medium text-gray-600 mb-1">内存使用率</div>
              <div className="text-lg font-bold text-green-600">58%</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
            <i className="fas fa-server text-gray-600 mr-2"></i>
            节点状态
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg">
              <span className="text-xs font-medium text-gray-700">节点-01</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">正常</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg">
              <span className="text-xs font-medium text-gray-700">节点-02</span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">高负载</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg">
              <span className="text-xs font-medium text-gray-700">节点-03</span>
              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">异常</span>
            </div>
          </div>
        </div>
      </div>
    );
    showDetailModal('计算服务详情', content);
  };

  const showStorageServiceModal = () => {
    showStorageServiceDetails();
  };

  const showMiddlewareServiceModal = () => {
    showMiddlewareServiceDetails();
  };

  const showComputeServiceModal = () => {
    showComputeServiceDetails();
  };

  // 一键检测功能
  const performDiagnostic = (type: string) => {
    // 显示检测进度弹窗
    const progressContent = (
      <div className="text-center py-4">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
          <i className="fas fa-cog fa-spin text-blue-600 text-2xl"></i>
        </div>
        <h3 className="text-lg font-bold text-blue-600 mb-3">{type}性能检测中...</h3>
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
          <div className="text-sm font-medium text-blue-700 mb-1">正在检测系统性能指标</div>
          <div className="text-sm font-medium text-blue-700">预计完成时间: 3-5秒</div>
        </div>
      </div>
    );
    
    showDetailModal(`${type}性能检测中...`, progressContent);
    
    // 3秒后显示检测结果
    setTimeout(() => {
      const resultContent = (
        <div className="space-y-4">
          <div className="text-center py-3">
            <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
              <i className="fas fa-check text-green-600 text-2xl"></i>
            </div>
            <h3 className="text-lg font-bold text-green-600 mb-1">{type}检测完成</h3>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
            <h4 className="text-base font-semibold text-green-800 mb-3 flex items-center">
              <i className="fas fa-chart-line text-green-600 mr-2"></i>
              检测结果
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <div className="text-xs font-medium text-gray-600 mb-1">当前使用率</div>
                <div className="text-xl font-bold text-green-600">72%</div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <div className="text-xs font-medium text-gray-600 mb-1">平均负载</div>
                <div className="text-xl font-bold text-blue-600">1.2</div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <div className="text-xs font-medium text-gray-600 mb-1">温度状态</div>
                <div className="text-xl font-bold text-orange-600">58°C</div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <div className="text-xs font-medium text-gray-600 mb-1">健康状态</div>
                <div className="text-xl font-bold text-green-600">正常</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
            <h4 className="text-base font-semibold text-blue-800 mb-2 flex items-center">
              <i className="fas fa-lightbulb text-blue-600 mr-2"></i>
              建议
            </h4>
            <p className="text-sm text-blue-800 leading-relaxed">{type}性能表现良好，所有指标均在正常范围内。建议继续保持定期监控。</p>
          </div>
        </div>
      );
      showDetailModal(`${type}性能检测结果`, resultContent);
    }, 3000);
  };

  // 分页相关函数
  const totalPages = Math.ceil(serviceData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentServices = serviceData.slice(startIndex, endIndex);

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  // 查看服务详情
  const showServiceDetails = (service: any) => {
    const content = (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
          <h4 className="text-base font-semibold text-blue-800 mb-3 flex items-center">
            <i className={`${service.icon} text-blue-600 mr-1 text-sm`}></i>
            {service.name}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
              <div className="text-xs font-medium text-gray-600 mb-1">服务版本</div>
              <div className="text-sm font-bold text-blue-600">{service.version}</div>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
              <div className="text-xs font-medium text-gray-600 mb-1">运行状态</div>
              <div className={`text-sm font-bold ${service.status === 'running' ? 'text-green-600' : 'text-red-600'}`}>
                {service.status === 'running' ? '正常运行' : '服务异常'}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
              <div className="text-xs font-medium text-gray-600 mb-1">最后检查</div>
              <div className="text-sm font-bold text-orange-600">{service.lastCheck}</div>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
              <div className="text-xs font-medium text-gray-600 mb-1">服务ID</div>
              <div className="text-sm font-bold text-purple-600">{service.id}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
            <i className="fas fa-chart-bar text-gray-600 mr-1 text-sm"></i>
            性能指标
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg shadow-sm">
              <span className="text-xs font-medium text-gray-700">CPU使用率</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">正常 (45%)</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg shadow-sm">
              <span className="text-xs font-medium text-gray-700">内存占用</span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">中等 (68%)</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg shadow-sm">
              <span className="text-xs font-medium text-gray-700">网络连接</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">稳定</span>
            </div>
          </div>
        </div>
        
        {service.status === 'error' && (
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h4 className="text-base font-semibold text-red-800 mb-2 flex items-center">
              <i className="fas fa-exclamation-triangle text-red-600 mr-1 text-sm"></i>
              异常信息
            </h4>
            <p className="text-xs text-red-800 leading-relaxed">服务连接超时，可能是网络问题或服务进程异常。建议检查服务日志并考虑重启服务。</p>
          </div>
        )}
      </div>
    );
    showDetailModal(`${service.name} - 详细信息`, content);
  };

  // 重启服务
  const restartService = (service: any) => {
    const confirmContent = (
      <div className="text-center py-4">
        <div className="w-12 h-12 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
          <i className="fas fa-exclamation-triangle text-yellow-600 text-lg"></i>
        </div>
        <h3 className="text-base font-bold text-gray-800 mb-2">确认重启服务</h3>
        <p className="text-sm text-gray-600 mb-4">您确定要重启 <strong>{service.name}</strong> 吗？</p>
        <p className="text-xs text-yellow-600 mb-4">重启过程可能需要1-2分钟，期间服务将暂时不可用。</p>
        <div className="flex justify-center space-x-3">
          <button 
            className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
            onClick={() => setModalVisible(false)}
          >
            取消
          </button>
          <button 
            className="px-4 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
            onClick={() => performRestart(service)}
          >
            确认重启
          </button>
        </div>
      </div>
    );
    showDetailModal('重启服务确认', confirmContent);
  };

  // 执行重启
  const performRestart = (service: any) => {
    // 显示重启进度
    const progressContent = (
      <div className="text-center py-6">
        <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <i className="fas fa-redo text-orange-600 text-lg animate-spin"></i>
        </div>
        <h3 className="text-base font-bold text-gray-800 mb-2">正在重启 {service.name}</h3>
        <p className="text-sm text-gray-600 mb-4">正在停止服务进程...</p>
        <div className="bg-gradient-to-r from-orange-50 to-red-50 p-3 rounded-lg border border-orange-200">
          <div className="text-xs font-medium text-orange-700 mb-1">重启进度: 正在关闭连接</div>
          <div className="text-xs font-medium text-orange-700">预计完成时间: 1-2分钟</div>
        </div>
      </div>
    );
    
    showDetailModal('重启进行中...', progressContent);
    
    // 模拟重启过程
    setTimeout(() => {
      const successContent = (
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
            <i className="fas fa-check text-green-600 text-lg"></i>
          </div>
          <h3 className="text-base font-bold text-green-600 mb-2">重启成功</h3>
          <p className="text-sm text-gray-600 mb-3">{service.name} 已成功重启并恢复正常运行</p>
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="text-xs text-green-700">✓ 服务进程已启动</div>
            <div className="text-xs text-green-700">✓ 健康检查通过</div>
            <div className="text-xs text-green-700">✓ 网络连接正常</div>
          </div>
        </div>
      );
      showDetailModal('重启完成', successContent);
    }, 3000);
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'running':
        return <span className="bg-green-100 text-green-700 text-sm px-3 py-1 rounded-md font-medium">运行中</span>;
      case 'error':
        return <span className="bg-red-100 text-red-700 text-sm px-3 py-1 rounded-md font-medium">异常</span>;
      default:
        return <span className="bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-md font-medium">未知</span>;
    }
  };

  // CPU详情模态框内容
  const getCPUDetailContent = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">实时使用率</h4>
            <div className="text-3xl font-bold text-blue-600 mb-2">68.5%</div>
            <Progress percent={68.5} strokeColor="#1890ff" showInfo={false} />
          </div>
        </div>
      </div>
    </div>
  );

  const alertColumns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const color = type === 'error' ? 'red' : type === 'warning' ? 'orange' : 'blue';
        return <Tag color={color}>{type.toUpperCase()}</Tag>;
      }
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message'
    },
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time'
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: string) => {
        const color = severity === 'high' ? 'red' : severity === 'medium' ? 'orange' : 'green';
        return <Tag color={color}>{severity === 'high' ? '高' : severity === 'medium' ? '中' : '低'}</Tag>;
      }
    }
  ];

  const activityColumns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const iconMap = {
          info: <i className="fas fa-info-circle text-blue-500" />,
          warning: <i className="fas fa-exclamation-triangle text-yellow-500" />,
          success: <i className="fas fa-check-circle text-green-500" />,
          error: <i className="fas fa-times-circle text-red-500" />
        };
        return iconMap[type as keyof typeof iconMap] || iconMap.info;
      }
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message'
    },
    {
      title: '用户',
      dataIndex: 'user',
      key: 'user'
    },
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto">


        {/* 筛选条件 */}
        <div className="bg-gradient-to-r from-purple-100 via-blue-100 via-cyan-100 to-indigo-200 rounded-lg border border-purple-300 p-4 mb-6 shadow-lg backdrop-blur-sm">
          <div className="flex items-center space-x-4 w-full">
            <div className="flex items-center space-x-3 flex-1">
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">项目名称</span>
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white flex-1">
                <option value="">请选择类型</option>
                <option value="web">Web应用</option>
                <option value="mobile">移动应用</option>
                <option value="api">API服务</option>
                <option value="database">数据库</option>
              </select>
            </div>
            <div className="flex items-center space-x-3 flex-1">
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">区域</span>
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white flex-1">
                <option value="">请选择区域</option>
                <option value="beijing">北京</option>
                <option value="shanghai">上海</option>
                <option value="guangzhou">广州</option>
                <option value="shenzhen">深圳</option>
              </select>
            </div>
            <div className="flex items-center space-x-3 flex-1">
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">日期范围</span>
              <input 
                type="date" 
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white flex-1"
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="mb-6">
        <div className="flex gap-4">
          {/* 左侧状态卡片 */}
          <div className="w-3/10 flex flex-col space-y-2">
            {/* 系统状态卡片 */}
            <div className="bg-white rounded-xl p-3 shadow-sm card-shadow hover-scale cursor-pointer flex-1" onClick={() => showChartModal('系统状态趋势图', 'system')}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-dark">系统状态</h3>
                {showSystemIcon && (
                  <div className="bg-green-100 text-green-600 p-1 rounded-lg">
                    <i className="fas fa-server text-xs"></i>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-dark-2">运行状态</span>
                  <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full text-xs font-semibold">正常</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-dark-2">运行时间</span>
                  <span className="text-xs font-semibold text-green-600">{realTimeData.systemStatus.uptime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-dark-2">上次检查</span>
                  <span className="text-xs font-semibold text-gray-600">{realTimeData.systemStatus.lastCheck}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-dark-2">系统负载</span>
                  <span className="text-xs font-semibold text-blue-600">低</span>
                </div>
              </div>
            </div>

            {/* 运行中服务卡片 */}
            <div className="bg-white rounded-xl p-3 shadow-sm card-shadow hover-scale cursor-pointer flex-1" onClick={() => showChartModal('服务响应时间趋势图', 'service')}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-dark">服务状态</h3>
                {showServiceIcon && (
                  <div className="bg-blue-100 text-blue-600 p-1 rounded-lg">
                    <i className="fas fa-cogs text-xs"></i>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-dark-2">服务总数</span>
                  <span className="text-xs font-semibold text-blue-600">{realTimeData.services.total} 个</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center">
                    <div className="text-dark-2">正常</div>
                    <div className="font-semibold text-green-600">{realTimeData.services.running}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-dark-2">异常</div>
                    <div className="font-semibold text-red-600">{realTimeData.services.abnormal}</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-dark-2">响应时间</span>
                  <span className="text-xs font-semibold text-green-600">125ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-dark-2">平均负载</span>
                  <span className="text-xs font-semibold text-blue-600">68%</span>
                </div>
              </div>
            </div>

            {/* 资源使用率卡片 */}
            <div className="bg-white rounded-xl p-3 shadow-sm card-shadow hover-scale cursor-pointer flex-1" onClick={() => showChartModal('资源使用率趋势图', 'resource')}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-dark">资源监控</h3>
                {showResourceIcon && (
                  <div className="bg-orange-100 text-orange-600 p-1 rounded-lg">
                    <i className="fas fa-chart-pie text-xs"></i>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <div className="grid grid-cols-3 gap-1 text-xs">
                  <div className="text-center">
                    <div className="text-dark-2">CPU</div>
                    <div className="font-semibold text-orange-600">{Math.round(realTimeData.performance.cpu)}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-dark-2">内存</div>
                    <div className="font-semibold text-blue-600">{Math.round(realTimeData.performance.memory)}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-dark-2">磁盘</div>
                    <div className="font-semibold text-purple-600">{Math.round(realTimeData.performance.disk)}%</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-dark-2">网络流量</span>
                  <span className="text-xs font-semibold text-green-600">2.3MB/s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-dark-2">进程数</span>
                  <span className="text-xs font-semibold text-gray-600">247</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-dark-2">警告数</span>
                  <span className="text-xs font-semibold text-yellow-600">3</span>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧服务状态表格 */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl border border-gray-200 h-full card-shadow">
              <div className="h-full flex flex-col">
                <div className="flex-grow overflow-hidden">
                  <table className="w-full h-full table-fixed">
                    <thead className="bg-gradient-to-r from-slate-100 via-blue-100 to-indigo-200 border-b border-indigo-300 shadow-sm">
                      <tr>
                        <th className="px-3 py-4 text-left text-sm font-medium text-slate-700 border-r border-indigo-200 bg-gradient-to-r from-blue-50 to-indigo-100" style={{ width: '35%' }}>
                          <div className="flex items-center space-x-1">
                            <i className="fas fa-server text-blue-600 text-sm"></i>
                            <span>服务名称</span>
                          </div>
                        </th>
                        <th className="px-2 py-4 text-center text-sm font-medium text-slate-700 border-r border-indigo-200" style={{ width: '35%' }}>
                          <div className="flex items-center justify-center space-x-1">
                            <i className="fas fa-circle text-green-500 text-sm"></i>
                            <span>状态</span>
                          </div>
                        </th>
                        <th className="px-2 py-4 text-center text-sm font-medium text-slate-700 border-r border-indigo-200" style={{ width: '30%' }}>
                          <div className="flex items-center justify-center space-x-1">
                            <i className="fas fa-clock text-blue-500 text-sm"></i>
                            <span>最后检查</span>
                          </div>
                        </th>
                        <th className="px-2 py-4 pr-8 text-center text-sm font-medium text-slate-700" style={{ width: '30%' }}>
                          <div className="flex items-center justify-center space-x-1">
                            <i className="fas fa-cog text-orange-500 text-sm"></i>
                            <span>操作</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentServices.map((service, index) => (
                        <tr key={service.id} className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                          <td className="px-3 py-3 border-r border-gray-100">
                            <div className="flex items-center">
                              <div className={`${service.iconColor} p-2 rounded-md mr-3 shadow-sm`}>
                                <i className={`${service.icon} text-sm text-gray-800`}></i>
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 text-base">{service.name}</div>
                                <div className="text-xs text-gray-500">{service.version}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-3 text-center border-r border-gray-100">
                            {getStatusDisplay(service.status)}
                          </td>
                          <td className="px-2 py-3 text-sm text-gray-600 border-r border-gray-100 text-center">
                            {service.lastCheck}
                          </td>
                          <td className="px-2 py-3 pr-8">
                            <div className="flex justify-center space-x-2">
                              <button 
                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-all p-1 rounded" 
                                title="查看详情"
                                onClick={() => showServiceDetails(service)}
                              >
                                <i className="fas fa-eye text-xs"></i>
                              </button>
                              <button 
                                className={`${service.status === 'error' ? 'text-red-600 hover:text-red-800 hover:bg-red-50' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'} transition-all p-1 rounded`} 
                                title="重启服务"
                                onClick={() => restartService(service)}
                              >
                                <i className="fas fa-redo text-xs"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-3 py-2 pr-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    显示 {startIndex + 1}-{Math.min(endIndex, serviceData.length)} 条，共 {serviceData.length} 条
                  </div>
                  <div className="flex space-x-1">
                    <button 
                      className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                      onClick={prevPage} 
                      disabled={currentPage === 1}
                    >
                      <i className="fas fa-chevron-left text-xs"></i>
                    </button>
                    <div className="flex space-x-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          className={`w-8 h-8 flex items-center justify-center rounded border text-xs transition-colors ${
                            currentPage === page 
                              ? 'border-blue-500 bg-blue-500 text-white' 
                              : 'border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600'
                          }`}
                          onClick={() => goToPage(page)}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button 
                      className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                      onClick={nextPage}
                      disabled={currentPage === totalPages}
                    >
                      <i className="fas fa-chevron-right text-xs"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* 服务监控状态区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* 存储服务监控 */}
        <div className="bg-white rounded-xl p-6 shadow-sm card-shadow hover-scale cursor-pointer" onClick={showStorageServiceDetails}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark">存储服务</h3>
            <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
              <i className="fas fa-database"></i>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-dark-2">整体状态</span>
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-semibold">部分异常</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-dark-2">服务总数</span>
              <span className="text-sm font-semibold text-blue-600">15 个</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="text-center">
                <div className="text-dark-2">正常</div>
                <div className="font-semibold text-green-600">12 个</div>
              </div>
              <div className="text-center">
                <div className="text-dark-2">异常</div>
                <div className="font-semibold text-red-600">3 个</div>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <button className="w-full bg-blue-50 text-blue-600 py-2 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium" onClick={showStorageServiceModal}>
              查看详情
            </button>
          </div>
        </div>

        {/* 中间件服务监控 */}
        <div className="bg-white rounded-xl p-6 shadow-sm card-shadow hover-scale cursor-pointer" onClick={showMiddlewareServiceDetails}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark">中间件服务</h3>
            <div className="bg-purple-100 text-purple-600 p-2 rounded-lg">
              <i className="fas fa-layer-group"></i>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-dark-2">整体状态</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">全部正常</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-dark-2">服务总数</span>
              <span className="text-sm font-semibold text-purple-600">8 个</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="text-center">
                <div className="text-dark-2">正常</div>
                <div className="font-semibold text-green-600">8 个</div>
              </div>
              <div className="text-center">
                <div className="text-dark-2">异常</div>
                <div className="font-semibold text-gray-500">0 个</div>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <button className="w-full bg-purple-50 text-purple-600 py-2 rounded-lg hover:bg-purple-100 transition-colors text-xs font-medium" onClick={showMiddlewareServiceModal}>
              查看详情
            </button>
          </div>
        </div>

        {/* 计算服务监控 */}
        <div className="bg-white rounded-xl p-6 shadow-sm card-shadow hover-scale cursor-pointer" onClick={showComputeServiceDetails}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark">计算服务</h3>
            <div className="bg-green-100 text-green-600 p-2 rounded-lg">
              <i className="fas fa-server"></i>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-dark-2">整体状态</span>
              <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-semibold">严重异常</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-dark-2">服务总数</span>
              <span className="text-sm font-semibold text-green-600">22 个</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="text-center">
                <div className="text-dark-2">正常</div>
                <div className="font-semibold text-green-600">17 个</div>
              </div>
              <div className="text-center">
                <div className="text-dark-2">异常</div>
                <div className="font-semibold text-red-600">5 个</div>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <button className="w-full bg-orange-50 text-orange-600 py-2 rounded-lg hover:bg-orange-100 transition-colors text-xs font-medium" onClick={showComputeServiceModal}>
              查看详情
            </button>
          </div>
        </div>
        </div>

      {/* 一键问题排查 */}
      <div className="mb-6">
        <Card className="shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-1">一键问题排查</h3>
            </div>
            <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2 font-medium">
              <i className="fas fa-search text-base"></i>
              <span className="text-base">全面系统检测</span>
            </button>
          </div>
          
          {/* 诊断卡片 */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 cursor-pointer group" onClick={() => performDiagnostic('CPU')}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-microchip text-blue-600 text-lg"></i>
                </div>
                <div className="px-2 py-1 bg-blue-50 text-blue-600 text-sm font-medium rounded-full">
                  正常
                </div>
              </div>
              <h3 className="text-base font-semibold text-slate-800 mb-2">CPU性能诊断</h3>
              <p className="text-sm text-slate-500 mb-3 leading-relaxed">检测CPU使用情况、负载均衡、进程占用</p>
              <div className="text-sm text-blue-600 font-medium group-hover:text-blue-700 transition-colors">
                立即检测 →
              </div>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 cursor-pointer group" onClick={() => performDiagnostic('内存')}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-memory text-emerald-600 text-lg"></i>
                </div>
                <div className="px-2 py-1 bg-emerald-50 text-emerald-600 text-sm font-medium rounded-full">
                  正常
                </div>
              </div>
              <h3 className="text-base font-semibold text-slate-800 mb-2">内存使用诊断</h3>
              <p className="text-sm text-slate-500 mb-3 leading-relaxed">监控内存占用、缓存命中率、内存泄漏</p>
              <div className="text-sm text-emerald-600 font-medium group-hover:text-emerald-700 transition-colors">
                立即检测 →
              </div>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 cursor-pointer group" onClick={() => performDiagnostic('基础健康')}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-shield-alt text-amber-600 text-lg"></i>
                </div>
                <div className="px-2 py-1 bg-amber-50 text-amber-600 text-sm font-medium rounded-full">
                  警告
                </div>
              </div>
              <h3 className="text-base font-semibold text-slate-800 mb-2">基础健康诊断</h3>
              <p className="text-sm text-slate-500 mb-3 leading-relaxed">系统基础、配置、安全漏洞检测</p>
              <div className="text-sm text-amber-600 font-medium group-hover:text-amber-700 transition-colors">
                立即检测 →
              </div>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 cursor-pointer group" onClick={() => performDiagnostic('网络连接')}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-rose-500/10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-wifi text-rose-600 text-lg"></i>
                </div>
                <div className="px-2 py-1 bg-rose-50 text-rose-600 text-sm font-medium rounded-full">
                  异常
                </div>
              </div>
              <h3 className="text-base font-semibold text-slate-800 mb-2">网络连接诊断</h3>
              <p className="text-sm text-slate-500 mb-3 leading-relaxed">检测网络延迟、带宽占用、连接稳定性</p>
              <div className="text-sm text-rose-600 font-medium group-hover:text-rose-700 transition-colors">
                立即检测 →
              </div>
            </div>
          </div>
          
          {/* 最近诊断历史 */}
          <div>
            <h4 className="text-base font-medium text-gray-700 mb-3">最近诊断记录</h4>
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              {/* 表头 */}
              <div className="grid grid-cols-5 gap-8 px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="text-sm font-medium text-slate-600">诊断类型</div>
                <div className="text-sm font-medium text-slate-600">时间</div>
                <div className="text-sm font-medium text-slate-600">状态</div>
                <div className="text-sm font-medium text-slate-600">结果</div>
                <div className="text-sm font-medium text-slate-600 text-center pr-2">操作</div>
              </div>
              
              {/* 数据行 */}
              <div className="divide-y divide-slate-100">
                <div className="grid grid-cols-5 gap-8 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="text-sm text-slate-700 font-medium">基础健康诊断</div>
                  <div className="text-sm text-blue-600">2023-06-18 09:45</div>
                  <div>
                    <span className="px-2 py-1 bg-red-50 text-red-600 text-sm rounded-full border border-red-200">发现问题</span>
                  </div>
                  <div className="text-sm text-slate-600">磁盘/dev/sda使用率超过85%</div>
                  <div className="text-center pr-2">
                    <span className="text-sm text-blue-600 cursor-pointer hover:text-blue-700 hover:underline">查看详情</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-5 gap-8 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="text-sm text-slate-700 font-medium">内存使用诊断</div>
                  <div className="text-sm text-blue-600">2023-06-18 08:12</div>
                  <div>
                    <span className="px-2 py-1 bg-amber-50 text-amber-600 text-sm rounded-full border border-amber-200">警告</span>
                  </div>
                  <div className="text-sm text-slate-600">内存泄漏风险，应用内存持续增长</div>
                  <div className="text-center pr-2">
                    <span className="text-sm text-blue-600 cursor-pointer hover:text-blue-700 hover:underline">查看详情</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-5 gap-8 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="text-sm text-slate-700 font-medium">CPU性能诊断</div>
                  <div className="text-sm text-blue-600">2023-06-17 16:30</div>
                  <div>
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-sm rounded-full border border-emerald-200">正常</span>
                  </div>
                  <div className="text-sm text-slate-600">CPU使用率正常，平均负载1.2</div>
                  <div className="text-center pr-2">
                    <span className="text-sm text-blue-600 cursor-pointer hover:text-blue-700 hover:underline">查看详情</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-5 gap-8 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="text-sm text-slate-700 font-medium">网络连接诊断</div>
                  <div className="text-sm text-blue-600">2023-06-17 14:15</div>
                  <div>
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-sm rounded-full border border-emerald-200">正常</span>
                  </div>
                  <div className="text-sm text-slate-600">网络延迟12ms，连接稳定</div>
                  <div className="text-center pr-2">
                    <span className="text-sm text-blue-600 cursor-pointer hover:text-blue-700 hover:underline">查看详情</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 模态框 */}
      <Modal
        title={modalTitle}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={380}
      >
        {modalContent}
      </Modal>

      {/* 折线图模态框 */}
      <Modal
        title={chartTitle}
        open={chartModalVisible}
        onCancel={() => setChartModalVisible(false)}
        footer={null}
        width={580}
        className="chart-modal"
        styles={{
          body: { padding: 0 },
          header: { 
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            borderBottom: '1px solid #e2e8f0',
            borderRadius: '8px 8px 0 0'
          }
        }}
      >
        <div className="p-3 bg-gradient-to-br from-slate-50/80 via-white to-blue-50/60">
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2 p-2 bg-white/70 backdrop-blur-sm rounded-lg border border-slate-200/50 shadow-sm">
              <span className="text-xs font-medium text-slate-700 flex items-center">
                <svg className="w-3 h-3 mr-1.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                最近24小时数据
              </span>
              <span className="text-xs text-slate-500 bg-slate-100/60 px-2 py-0.5 rounded-full">
                {lastUpdateTime.toLocaleTimeString()}
              </span>
            </div>
          </div>
          <div className="mb-3 p-1.5 bg-white/50 backdrop-blur-sm rounded-lg border border-slate-200/40 shadow-inner overflow-hidden">
            {chartData.length > 0 && (
              <SimpleLineChart data={chartData} width={520} height={220} />
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-gradient-to-br from-blue-50/80 to-blue-100/60 p-2 rounded-lg text-center border border-blue-200/40 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
              <div className="text-xs text-slate-600 mb-0.5 font-medium">当前值</div>
              <div className="text-base font-bold text-blue-600">
                {chartData.length > 0 ? `${chartData[chartData.length - 1]?.value}${chartType === 'service' ? 'ms' : '%'}` : '--'}
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50/80 to-emerald-100/60 p-2 rounded-lg text-center border border-emerald-200/40 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
              <div className="text-xs text-slate-600 mb-0.5 font-medium">平均值</div>
              <div className="text-base font-bold text-emerald-600">
                {chartData.length > 0 ? `${Math.round(chartData.reduce((sum, item) => sum + item.value, 0) / chartData.length * 100) / 100}${chartType === 'service' ? 'ms' : '%'}` : '--'}
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-50/80 to-amber-100/60 p-2 rounded-lg text-center border border-amber-200/40 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
              <div className="text-xs text-slate-600 mb-0.5 font-medium">峰值</div>
              <div className="text-base font-bold text-amber-600">
                {chartData.length > 0 ? `${Math.max(...chartData.map(item => item.value))}${chartType === 'service' ? 'ms' : '%'}` : '--'}
              </div>
            </div>
          </div>
          <div className="p-2 bg-white/60 backdrop-blur-sm rounded-lg border border-slate-200/40">
            <div className="text-xs text-slate-600">
              <div className="flex items-center space-x-2">
                <span className="flex items-center text-blue-600">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  数据说明:
                </span>
                <span className="text-xs text-slate-500">
                  {chartType === 'system' && '系统可用性百分比，正常: 99.5%-100%'}
                  {chartType === 'service' && '服务响应时间，正常: 50-200ms'}
                  {chartType === 'resource' && '资源使用率，正常: 40%-80%'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Modal>
      </div>
    </div>
  );
}

