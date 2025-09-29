'use client';

import React, { useState, useEffect, useRef } from 'react';
import ChatInputPanel from '@/components/chat/input/chat-input-panel';

export default function IntelligentScriptsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('all');
  // 是否已触发渲染
  const [hasSent, setHasSent] = useState(false);
  // 左侧诊断可见与流式内容
  const [visibleDiagnosisIds, setVisibleDiagnosisIds] = useState<number[]>([]);
  const [diagnosisBodies, setDiagnosisBodies] = useState<Record<number, string>>({});
  // 右侧日志可见与流式内容
  const [visibleLogIds, setVisibleLogIds] = useState<number[]>([]);
  const [logBodies, setLogBodies] = useState<Record<number, string>>({});
  
  // 滚动容器引用
  const diagnosisScrollRef = useRef<HTMLDivElement>(null);
  const logScrollRef = useRef<HTMLDivElement>(null);

  // 诊断卡片条目（左侧）
  const diagnosisItems = [
    {
      id: 1,
      title: '📊 组件状态汇总',
      tags: ['summary'],
      body:
        `组件, 节点, 状态, 说明\n` +
        `apisix | 10.88.4.195, 10.88.4.196 | ❌ 异常 | SSL证书有效期无法获取，访问日志检查失败\n` +
        `ceph-osd | 10.88.4.193, 10.88.4.194, 10.88.4.195, 10.88.4.196 | ✅ 正常 | 所有OSD进程正常\n` +
        `ceph-mon | 10.88.4.193, 10.88.4.194, 10.88.4.195, 10.88.4.196 | ✅ 正常 | 集群健康状态正常\n` +
        `mon_leader | 10.88.4.193, 10.88.4.194, 10.88.4.195, 10.88.4.196 | ✅ 正常 | 集群健康、容量正常\n` +
        `slb | 10.88.4.197, 10.88.4.198 | ✅ 正常 | 仅存在YAML加载警告\n` +
        `keepalived | 10.88.4.197, 10.88.4.198 | ✅ 正常 | VIP正常，未发现异常\n` +
        `apisix访问日志 | 10.88.4.195, 10.88.4.196 | ❌ 异常 | 日志检查失败\n` +
        `ceph慢操作日志 | 10.88.4.193 | ❌ 异常 | 检查失败，可能有性能问题`,
    },
    {
      id: 2,
      title: '🔧 异常信息详解 - SSL证书有效期检查失败',
      tags: ['error', 'apisix', 'ssl'],
      body:
        `节点: 10.88.4.195, 10.88.4.196\n` +
        `异常信息:\n{"changed": false, "msg": "无法获取证书有效期", "failed": true}\n` +
        `可能原因:\n- 证书文件路径错误或权限不足\n- 证书文件损坏\n- openssl 未正确安装\n- 脚本未正确处理证书输出格式\n` +
        `影响:\n- 无法预警证书过期，可能导致 HTTPS 服务中断\n` +
        `建议操作:\n- 检查证书文件是否存在及权限是否正确\n- 确认证书已正确加载到 Nginx/Envoy 等服务\n- 在 Ansible 脚本中增加调试输出以确认 openssl 执行是否正常`,
    },
    {
      id: 3,
      title: '❌ Ceph慢操作日志异常',
      tags: ['error', 'ceph', 'slow-ops'],
      body:
        `现象: ceph-slow-ops.log 检查失败（返回码1）\n` +
        `节点: 10.88.4.193\n` +
        `SOP:\n- 检查 ceph health 是否有告警\n- 查看 /var/log/ceph/ceph-slow-ops.log 内容\n- 优化存储性能:\n  * 检查 OSD 磁盘 I/O 负载，必要时加缓存/换硬件\n  * 调整 osd_max_split_time 等参数\n- 修改检查脚本逻辑（慢操作数量>阈值再报错）`,
    },
    {
      id: 4,
      title: '⚠️ SLB YAML兼容性警告',
      tags: ['warning', 'slb', 'yaml'],
      body:
        `现象: slb 模块提示 YAML 格式兼容性问题\n` +
        `节点: 10.88.4.197, 10.88.4.198\n` +
        `SOP:\n- 检查 Ansible 版本是否支持当前 YAML 语法\n- 使用 yamllint 验证 YAML 文件\n- 更新脚本兼容性声明（添加标签/调整缩进）`,
    },
  ];

  // 日志与指标条目（右侧）
  const logItems = [
    {
      id: 1,
      title: '🔍 系统组件检查',
      tags: ['component', 'runtime'],
      body:
        `Apisix 服务状态（10.88.4.195, 10.88.4.196）\n` +
        `服务运行正常，但 SSL 证书检查存在问题\n` +
        `状态: 异常\n详情: 证书有效期获取失败\n\n` +
        `Ceph 集群状态（10.88.4.193, .194, .195, .196）\n` +
        `健康: HEALTH_OK\nOSD: 正常\nMON: 正常\n容量: 充足`,
    },
    {
      id: 2,
      title: '📊 负载均衡检查',
      tags: ['slb', 'keepalived'],
      body:
        `SLB 服务状态（10.88.4.197, 10.88.4.198）\n` +
        `配置状态: 正常\n备注: 仅存在 YAML 加载警告，不影响服务\n\n` +
        `Keepalived 高可用（10.88.4.197, 10.88.4.198）\n` +
        `VIP: 正常\n故障转移: 配置正确\n心跳检测: 正常`,
    },
    {
      id: 3,
      title: '📋 日志分析',
      tags: ['logs', 'analysis'],
      body:
        `Apisix 访问日志（10.88.4.195, 10.88.4.196）\n` +
        `检查: 失败\n错误: 无法访问或解析日志文件\n建议: 检查日志文件权限和路径配置\n\n` +
        `Ceph 慢操作日志（10.88.4.193）\n` +
        `检查: 异常\n影响: 可能存在性能瓶颈\n建议: 检查存储性能与网络延迟`,
    },
    {
      id: 4,
      title: '🎯 性能指标',
      tags: ['perf', 'metrics'],
      body:
        `CPU: 正常范围\n内存: 正常\n磁盘I/O: 部分节点存在慢操作\n网络延迟: 正常`,
    },
  ];

  const handleClear = () => {
    setSearchQuery('');
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('已复制到剪贴板');
    });
  };

  const needsCode = (text: string) => {
    if (!text) return false;
    return /(^\s*\{[\s\S]*\}\s*$)|(^\s*select\s+)|(^\s*SELECT\s+)|(^\s*-\s)/im.test(text) || text.includes('\n');
  };

  // 自动滚动到指定容器底部
  const scrollToBottom = (scrollRef: React.RefObject<HTMLDivElement>) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  // 将文本按字符“流式”追加；与 ScriptCollectionPage 保持一致
  const streamText = (full: string, onChunk: (s: string) => void, speed = 10, scrollRef?: React.RefObject<HTMLDivElement>): Promise<void> => {
    return new Promise<void>((resolve) => {
      let idx = 0;
      const timer = setInterval(() => {
        idx += 1;
        onChunk(full.slice(0, idx));
        
        // 每次更新内容后自动滚动到底部
        if (scrollRef) {
          setTimeout(() => scrollToBottom(scrollRef), 0);
        }
        
        if (idx >= full.length) {
          clearInterval(timer);
          resolve();
        }
      }, speed);
    });
  };

  // 触发后依次加入左右两侧条目并流式渲染
  const startStreaming = () => {
    setHasSent(true);
    setVisibleDiagnosisIds([]);
    setDiagnosisBodies({});
    setVisibleLogIds([]);
    setLogBodies({});

    const left = [...diagnosisItems];
    const right = [...logItems];

    (async () => {
      // 先右侧，再左侧，保证与另一个页面的体验一致
      for (const item of right) {
        setVisibleLogIds(prev => [...prev, item.id]);
        setLogBodies(prev => ({ ...prev, [item.id]: '' }));
        await streamText(item.body, (chunk) => {
          setLogBodies(prev => ({ ...prev, [item.id]: chunk }));
        }, 18, logScrollRef);
      }

      for (const item of left) {
        setVisibleDiagnosisIds(prev => [...prev, item.id]);
        setDiagnosisBodies(prev => ({ ...prev, [item.id]: '' }));
        await streamText(item.body, (chunk) => {
          setDiagnosisBodies(prev => ({ ...prev, [item.id]: chunk }));
        }, 18, diagnosisScrollRef);
      }
    })();
  };

  return (
    <>
      <style jsx global>{`
        :root{
          --bg:#ffffff; --panel:#ffffff; --muted:#5f6b7b; --text:#1c2333; --accent:#2b6cff; --ring:#a8c0ff;
          --ok:#1f9d55; --warn:#b58900; --err:#e02424; --chip:#f3f6ff; --border:#e6e9f2; --code:#f7f9ff;
          --think:#f2f6ff; --think-border:#c8d6ff; --success:#dcfce7; --success-border:#16a34a;
          --warning:#fef3c7; --warning-border:#d97706; --error:#fecaca; --error-border:#dc2626;
        }
        body{
          margin:0;background:var(--bg);
          color:var(--text); font:14px/1.6 "Inter",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;
        }
        .app{width:98% !important; max-width:none !important; margin:10px !important; padding:10px !important}
        .card{background:var(--panel); border:1px solid var(--border); border-radius:16px; box-shadow:0 6px 24px rgba(0,0,0,0.06)}
        header.card{padding:18px 20px; display:flex; gap:12px; align-items:center; justify-content:space-between}
        h1{font-size:18px;margin:0}
        .controls{display:flex;gap:10px;flex-wrap:wrap}
        .chip{border:1px solid var(--border); background:var(--chip); color:var(--text); padding:6px 10px; border-radius:999px; display:inline-flex; align-items:center; gap:8px}
        .chip input,.chip select{border:none; background:transparent; color:inherit; outline:none}
        .chip button{all:unset; cursor:pointer; padding:2px 6px; border-radius:8px}
        .chip button:hover{background:#eef2ff}
        .toolbar{display:flex; gap:8px; flex-wrap:wrap}
        .btn{border:1px solid var(--border); background:#fff; padding:8px 12px; border-radius:12px; cursor:pointer}
        .btn:hover{border-color:var(--ring); background:#f7faff}
        /* 缩小本页按钮尺寸（仅限本页的两个区域） */
        .diagnosis-section .btn, .log-section .btn{ padding:6px 10px; border-radius:10px; font-size:12px }
        
        /* 左右分栏布局 */
        .main-grid{display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-top:16px; height: calc(100vh - 60px)}
        .left-panel.card{padding:0; display:flex; flex-direction:column; height: 100%; overflow: hidden}
        .right-panel.card{padding:0; display:flex; flex-direction:column; height: 100%; overflow: hidden}
        
        /* 诊断报告样式 */
        .diagnosis-section{display:flex; flex-direction:column; height:100%; padding:16px; padding-bottom:0}
        .diagnosis-section h2{font-size:16px; margin:0 0 12px 0; color:var(--accent); border-bottom:2px solid var(--border); padding-bottom:8px; flex-shrink:0}
        .diagnosis-content{flex:1; display:flex; flex-direction:column; min-height:0}
        .scrollable-diagnosis{flex:1; overflow-y:scroll; min-height:0; padding-right:4px; scrollbar-gutter: stable both-edges}
        .scrollable-diagnosis::-webkit-scrollbar{width:6px}
        .scrollable-diagnosis::-webkit-scrollbar-track{background:transparent}
        .scrollable-diagnosis::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.1); border-radius:3px}
        .scrollable-diagnosis::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,0.2)}
        .status-summary{background:#fff; border:1px solid var(--border); border-radius:12px; padding:16px; margin-bottom:16px}
        .status-table{width:100%; border-collapse:collapse; margin-bottom:16px}
        .status-table th{background:var(--chip); padding:8px 12px; text-align:left; font-weight:600; border:1px solid var(--border)}
        .status-table th:nth-child(3){width:100px; min-width:100px}
        .status-table td{padding:8px 12px; border:1px solid var(--border); vertical-align:top}
        .status-table td:nth-child(3){width:120px; min-width:120px}
        .status-normal{color:var(--ok); font-weight:600}
        .status-error{color:var(--err); font-weight:600}
        .status-warning{color:var(--warn); font-weight:600}
        
        .issue-item{background:#fff; border:1px solid var(--border); border-radius:12px; padding:16px; margin-bottom:12px}
        .issue-item.error{background:var(--error); border-color:var(--error-border)}
        .issue-item.warning{background:var(--warning); border-color:var(--warning-border)}
        .issue-title{font-weight:600; font-size:15px; margin-bottom:8px; display:flex; align-items:center; gap:8px}
        .issue-content{font-size:14px; line-height:1.5}
        .issue-list{margin:8px 0; padding-left:16px}
        .issue-list li{margin-bottom:4px}
        .diag-item{border:1px solid var(--border); border-radius:12px; padding:12px; margin-bottom:12px; background:#fff; position:relative}
        .diag-item .tags{display:flex; gap:6px; margin-bottom:8px}
        .diag-item .content{white-space:pre-wrap; word-break:break-word; font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace; font-size:13.5px; background:#f8f9fa; padding:10px; border-radius:8px; border:1px solid var(--border); font-weight:normal; color:#495057}
        
        /* 日志解析样式 */
        .log-section{display:flex; flex-direction:column; height:100%; padding:16px}
        .log-section h2{font-size:16px; margin:0 0 12px 0; color:var(--accent); border-bottom:2px solid var(--border); padding-bottom:8px; flex-shrink:0}
        .log-content{flex:1; display:flex; flex-direction:column; min-height:0}
        .scrollable-log{flex:1; overflow-y:scroll; min-height:0; padding-right:4px; scrollbar-gutter: stable both-edges}
        .scrollable-log::-webkit-scrollbar{width:6px}
        .scrollable-log::-webkit-scrollbar-track{background:transparent}
        .scrollable-log::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.1); border-radius:3px}
        .scrollable-log::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,0.2)}
        .module-item{background:#fff; border:1px solid var(--border); border-radius:12px; padding:12px; margin-bottom:12px; position:relative}
        .module-header{display:flex; align-items:center; gap:8px; margin-bottom:8px; padding-bottom:8px; border-bottom:1px solid var(--border)}
        .module-title{font-weight:600; font-size:14px}
        .module-status{padding:2px 8px; border-radius:12px; font-size:12px; font-weight:600}
        .module-status.success{background:var(--success); color:var(--ok)}
        .module-status.error{background:var(--error); color:var(--err)}
        .module-status.warning{background:var(--warning); color:var(--warn)}
        
        .check-item{margin-bottom:8px; padding:8px; background:var(--code); border-radius:8px; font-size:14px}
        .check-item strong{color:var(--accent)}
        .check-content{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace; font-size:13px; background:#f8f9fa; padding:8px; border-radius:6px; margin-top:4px; white-space:pre-wrap; word-break:break-word; font-weight:normal; color:#495057}
        
        .node-info{font-size:12px; color:var(--muted); margin-bottom:4px}
        .status-badge{padding:2px 6px; border-radius:4px; font-size:11px; font-weight:600}
        .status-badge.ok{background:var(--success); color:var(--ok)}
        .status-badge.error{background:var(--error); color:var(--err)}
        
        /* 代码和命令样式增强 */
        .check-content code, .diag-item .content code, .inline-code {
          background:#f8f9fa;
          padding:2px 4px;
          border-radius:3px;
          font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;
          font-weight:normal;
          color:#495057;
          font-size:12px;
          border:1px solid #dee2e6;
        }
        
        /* 右上角复制按钮样式 */
        .copy-btn-top-right{
          position:absolute;
          top:8px;
          right:8px;
          padding:4px 8px;
          font-size:11px;
          border-radius:6px;
          background:#fff;
          border:1px solid var(--border);
          color:var(--text);
          cursor:pointer;
          z-index:10;
          transition:all 0.2s ease;
        }
        .copy-btn-top-right:hover{
          border-color:var(--accent);
          background:var(--chip);
          color:var(--accent);
        }
        
        /* ChatInputPanel 包装器样式 */
        .chat-input-wrapper{padding:16px; flex-shrink:0}
        
        @media (max-width:1200px){ .main-grid{grid-template-columns:1fr} }
      `}</style>
      
      <div className="app">
        <div className="main-grid">
          <div className="left-panel card">
            <div className="diagnosis-section">
              <h2>🏥 诊断报告总览</h2>
              <div className="diagnosis-content">
                <div className="scrollable-diagnosis" ref={diagnosisScrollRef}>
                  {!hasSent ? (
                    <div className="issue-item" style={{opacity: 0.8}}>
                      <div className="issue-content">请在下方输入后点击发送以生成诊断内容</div>
                    </div>
                  ) : visibleDiagnosisIds.length > 0 ? (
                    visibleDiagnosisIds.map((id) => {
                      const item = diagnosisItems.find(i => i.id === id)!;
                      const body = diagnosisBodies[id] || '';
                      return (
                        <div key={id} className="diag-item">
                          <button className="btn copy-btn-top-right" onClick={() => handleCopyText(body)}>复制</button>
                          <div className="issue-title">{item.title}</div>
                          <div className="tags">
                            {item.tags.map((tag, index) => (
                              <span key={index} className="tag">#{tag}</span>
                            ))}
                          </div>
                          <div className={`content ${needsCode(body) ? '' : ''}`}>{body}</div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{textAlign: 'center', opacity: 0.7, padding: '20px'}}>暂无诊断内容</div>
                  )}
                </div>
                {/* ChatInputPanel 固定在底部 */}
                <div className="chat-input-wrapper">
                  <ChatInputPanel ctrl={new AbortController()} onSend={() => startStreaming()} />
                </div>
              </div>
            </div>
          </div>
          
          <div className="right-panel card">
            <div className="log-section">
              <h2>📋 日志与指标解析</h2>
              <div className="log-content">
                <div className="scrollable-log" ref={logScrollRef}>
                  {!hasSent ? (
                    <div className="module-item">
                      <div className="module-header">
                        <span className="module-title">等待发送以开始解析</span>
                        <span className="module-status warning">未开始</span>
                      </div>
                      <div className="check-item">点击下方发送按钮将开始逐条输出日志与指标解析结果</div>
                    </div>
                  ) : visibleLogIds.length > 0 ? (
                    visibleLogIds.map((id) => {
                      const item = logItems.find(i => i.id === id)!;
                      const body = logBodies[id] || '';
                      return (
                        <div key={id} className="module-item">
                          <button className="btn copy-btn-top-right" onClick={() => handleCopyText(body)}>复制</button>
                          <div className="module-header">
                            <span className="module-title">{item.title}</span>
                          </div>
                          <div className="check-item">
                            <div className="check-content">{body}</div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{textAlign: 'center', opacity: 0.7, padding: '20px'}}>暂无日志与指标解析</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
