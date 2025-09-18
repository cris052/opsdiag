'use client';

import React, { useState, useEffect } from 'react';
import ChatInputPanel from '@/components/chat/input/chat-input-panel';

export default function IntelligentScriptsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('all');

  // 渲染诊断报告内容
  const renderDiagnosis = () => {
    return `
      <div class="status-summary">
        <h3>📊 组件状态汇总</h3>
        <table class="status-table">
          <thead>
            <tr>
              <th>组件</th>
              <th>节点</th>
              <th>状态</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>apisix</strong></td>
              <td><code>10.88.4.195, 10.88.4.196</code></td>
              <td><span class="status-error">❌ 异常</span></td>
              <td>SSL证书有效期无法获取，访问日志检查失败</td>
            </tr>
            <tr>
              <td><strong>ceph-osd</strong></td>
              <td><code>10.88.4.193, 10.88.4.194, 10.88.4.195, 10.88.4.196</code></td>
              <td><span class="status-normal">✅ 正常</span></td>
              <td>所有OSD进程正常</td>
            </tr>
            <tr>
              <td><strong>ceph-mon</strong></td>
              <td><code>10.88.4.193, 10.88.4.194, 10.88.4.195, 10.88.4.196</code></td>
              <td><span class="status-normal">✅ 正常</span></td>
              <td>集群健康状态正常</td>
            </tr>
            <tr>
              <td><strong>mon_leader</strong></td>
              <td><code>10.88.4.193, 10.88.4.194, 10.88.4.195, 10.88.4.196</code></td>
              <td><span class="status-normal">✅ 正常</span></td>
              <td>集群健康、容量正常</td>
            </tr>
            <tr>
              <td><strong>slb</strong></td>
              <td><code>10.88.4.197, 10.88.4.198</code></td>
              <td><span class="status-normal">✅ 正常</span></td>
              <td>仅存在YAML加载警告</td>
            </tr>
            <tr>
              <td><strong>keepalived</strong></td>
              <td><code>10.88.4.197, 10.88.4.198</code></td>
              <td><span class="status-normal">✅ 正常</span></td>
              <td>VIP正常，未发现异常</td>
            </tr>
            <tr>
              <td><strong>apisix访问日志</strong></td>
              <td><code>10.88.4.195, 10.88.4.196</code></td>
              <td><span class="status-error">❌ 异常</span></td>
              <td>日志检查失败</td>
            </tr>
            <tr>
              <td><strong>ceph慢操作日志</strong></td>
              <td><code>10.88.4.193</code></td>
              <td><span class="status-error">❌ 异常</span></td>
              <td>检查失败，可能有性能问题</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="issue-item error">
        <div class="issue-title">🔧 异常信息详解</div>
        <div class="issue-content">
          <h4>1. SSL证书有效期检查失败</h4>
          <p><strong>节点：</strong>10.88.4.195, 10.88.4.196</p>
          <p><strong>异常信息：</strong></p>
          <div class="check-content">{"changed": false, "msg": "无法获取证书有效期", "failed": true}</div>
          <p><strong>可能原因：</strong></p>
          <ul class="issue-list">
            <li>证书文件路径错误或权限不足</li>
            <li>证书文件损坏</li>
            <li>openssl 命令未正确安装或不可用</li>
            <li>脚本未正确处理证书输出格式</li>
          </ul>
          <p><strong>影响：</strong></p>
          <ul class="issue-list">
            <li>无法预警证书过期，可能导致 HTTPS 服务中断</li>
          </ul>
          <p><strong>建议操作：</strong></p>
          <ul class="issue-list">
            <li>检查证书文件是否存在及权限是否正确</li>
            <li>确认证书是否已正确加载到 Nginx/Envoy 等服务中</li>
            <li>在 Ansible 脚本中增加调试输出，确认 openssl 命令执行是否正常</li>
          </ul>
        </div>
      </div>

      <div class="issue-item error">
        <div class="issue-title">2. Apisix访问日志检查失败</div>
        <div class="issue-content">
          <p><strong>节点：</strong>10.88.4.195, 10.88.4.196</p>
          <p><strong>异常信息：</strong></p>
          <div class="check-content">日志文件访问失败或格式解析错误</div>
          <p><strong>建议操作：</strong></p>
          <ul class="issue-list">
            <li>检查日志文件路径和权限</li>
            <li>确认日志格式配置正确</li>
            <li>检查磁盘空间是否充足</li>
          </ul>
        </div>
      </div>

      <div class="issue-item error">
        <div class="issue-title">❌ 3. Ceph慢操作日志异常</div>
        <div class="issue-content">
          <p><strong>现象：</strong>ceph-slow-ops.log检查失败（返回码1）。</p>
          <p><strong>节点：</strong>10.88.4.193</p>
          <p><strong>SOP解决方案：</strong></p>
          <ul class="issue-list">
            <li>检查Ceph集群健康状态（ceph health），查看是否有告警。</li>
            <li>查看慢操作日志内容（cat /var/log/ceph/ceph-slow-ops.log），分析是否有延迟操作。</li>
            <li><strong>优化存储性能：</strong>
              <ul style="margin-top: 4px; padding-left: 16px;">
                <li>检查OSD磁盘IO负载，必要时增加缓存或替换硬件。</li>
                <li>调整osd_max_split_time等参数以限制慢操作。</li>
              </ul>
            </li>
            <li>修改检查脚本逻辑，增加日志内容校验（如只报错当慢操作数量>阈值）。</li>
          </ul>
        </div>
      </div>

      <div class="issue-item warning">
        <div class="issue-title">⚠️ 4. SLB YAML兼容性警告</div>
        <div class="issue-content">
          <p><strong>现象：</strong>slb模块提示YAML格式兼容性问题。</p>
          <p><strong>节点：</strong>10.88.4.197, 10.88.4.198</p>
          <p><strong>SOP解决方案：</strong></p>
          <ul class="issue-list">
            <li>检查Ansible版本是否支持当前YAML语法（如使用---分隔符）。</li>
            <li>验证YAML文件格式（使用yamllint工具检查语法）。</li>
            <li>更新脚本兼容性声明（如添加yaml标签或调整缩进）。</li>
          </ul>
        </div>
      </div>
    `;
  };

  // 渲染日志解析内容
  const renderLogAnalysis = () => {
    return `
      <div class="module-item">
        <div class="module-header">
          <span class="module-title">🔍 系统组件检查</span>
          <span class="module-status success">运行中</span>
        </div>
        <div class="check-item">
          <strong>Apisix 服务状态：</strong>
          <div class="node-info">节点: 10.88.4.195, 10.88.4.196</div>
          <div class="check-content">服务运行正常，但SSL证书检查存在问题
状态: <span class="status-badge error">异常</span>
详情: 证书有效期获取失败</div>
        </div>
        <div class="check-item">
          <strong>Ceph 集群状态：</strong>
          <div class="node-info">节点: 10.88.4.193, 10.88.4.194, 10.88.4.195, 10.88.4.196</div>
          <div class="check-content">集群健康状态: HEALTH_OK
OSD状态: 所有OSD正常运行
MON状态: <span class="status-badge ok">正常</span>
存储容量: 充足</div>
        </div>
      </div>

      <div class="module-item">
        <div class="module-header">
          <span class="module-title">📊 负载均衡检查</span>
          <span class="module-status success">正常</span>
        </div>
        <div class="check-item">
          <strong>SLB 服务状态：</strong>
          <div class="node-info">节点: 10.88.4.197, 10.88.4.198</div>
          <div class="check-content">负载均衡服务正常
配置状态: <span class="status-badge ok">正常</span>
仅存在YAML加载警告，不影响服务</div>
        </div>
        <div class="check-item">
          <strong>Keepalived 高可用：</strong>
          <div class="node-info">节点: 10.88.4.197, 10.88.4.198</div>
          <div class="check-content">VIP状态: <span class="status-badge ok">正常</span>
故障转移: 配置正确
心跳检测: 正常</div>
        </div>
      </div>

      <div class="module-item">
        <div class="module-header">
          <span class="module-title">📋 日志分析</span>
          <span class="module-status error">异常</span>
        </div>
        <div class="check-item">
          <strong>Apisix 访问日志：</strong>
          <div class="node-info">节点: 10.88.4.195, 10.88.4.196</div>
          <div class="check-content">日志检查: <span class="status-badge error">失败</span>
错误信息: 无法访问或解析日志文件
建议: 检查日志文件权限和路径配置</div>
        </div>
        <div class="check-item">
          <strong>Ceph 慢操作日志：</strong>
          <div class="node-info">节点: 10.88.4.193</div>
          <div class="check-content">慢操作检查: <span class="status-badge error">异常</span>
性能影响: 可能存在性能瓶颈
建议: 检查存储性能和网络延迟</div>
        </div>
      </div>

      <div class="module-item">
        <div class="module-header">
          <span class="module-title">🎯 性能指标</span>
          <span class="module-status warning">警告</span>
        </div>
        <div class="check-item">
          <strong>系统资源使用率：</strong>
          <div class="check-content">CPU使用率: 正常范围内
内存使用率: 正常
磁盘I/O: 部分节点存在慢操作
网络延迟: 正常</div>
        </div>
      </div>
    `;
  };

  const handleClear = () => {
    setSearchQuery('');
  };

  const handleRefresh = () => {
    console.log('刷新数据');
  };

  const handleExport = () => {
    console.log('导出报告');
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
        .app{max-width:1400px;margin:28px auto;padding:0 16px}
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
        
        /* 左右分栏布局 */
        .main-grid{display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-top:16px; height: calc(100vh - 60px)}
        .left-panel.card{padding:0; display:flex; flex-direction:column; height: 100%; overflow: hidden}
        .right-panel.card{padding:0; display:flex; flex-direction:column; height: 100%; overflow: hidden}
        
        /* 诊断报告样式 */
        .diagnosis-section{display:flex; flex-direction:column; height:100%; padding:16px; padding-bottom:0}
        .diagnosis-section h2{font-size:16px; margin:0 0 12px 0; color:var(--accent); border-bottom:2px solid var(--border); padding-bottom:8px; flex-shrink:0}
        .diagnosis-content{flex:1; overflow-y:auto; padding-right:4px; min-height:0; display:flex; flex-direction:column}
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
        .issue-content{font-size:13px; line-height:1.5}
        .issue-list{margin:8px 0; padding-left:16px}
        .issue-list li{margin-bottom:4px}
        
        /* 日志解析样式 */
        .log-section{display:flex; flex-direction:column; height:100%; padding:16px}
        .log-section h2{font-size:16px; margin:0 0 12px 0; color:var(--accent); border-bottom:2px solid var(--border); padding-bottom:8px; flex-shrink:0}
        .log-content{flex:1; overflow-y:auto; padding-right:4px; min-height:0}
        .module-item{background:#fff; border:1px solid var(--border); border-radius:12px; padding:12px; margin-bottom:12px}
        .module-header{display:flex; align-items:center; gap:8px; margin-bottom:8px; padding-bottom:8px; border-bottom:1px solid var(--border)}
        .module-title{font-weight:600; font-size:14px}
        .module-status{padding:2px 8px; border-radius:12px; font-size:12px; font-weight:600}
        .module-status.success{background:var(--success); color:var(--ok)}
        .module-status.error{background:var(--error); color:var(--err)}
        .module-status.warning{background:var(--warning); color:var(--warn)}
        
        .check-item{margin-bottom:8px; padding:8px; background:var(--code); border-radius:8px; font-size:13px}
        .check-item strong{color:var(--accent)}
        .check-content{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace; font-size:12px; background:#f8fafc; padding:8px; border-radius:6px; margin-top:4px; white-space:pre-wrap; word-break:break-word}
        
        .node-info{font-size:12px; color:var(--muted); margin-bottom:4px}
        .status-badge{padding:2px 6px; border-radius:4px; font-size:11px; font-weight:600}
        .status-badge.ok{background:var(--success); color:var(--ok)}
        .status-badge.error{background:var(--error); color:var(--err)}
        
        /* ChatInputPanel 包装器样式 */
        .chat-input-wrapper{padding:16px; flex-shrink:0}
        .scrollable-diagnosis{flex:1; overflow-y:auto; min-height:0}
        
        @media (max-width:1200px){ .main-grid{grid-template-columns:1fr} }
      `}</style>
      
      <div className="app">
        <div className="main-grid">
          <div className="left-panel card">
            <div className="diagnosis-section">
              <h2>🏥 诊断报告总览</h2>
              <div className="diagnosis-content">
                <div className="scrollable-diagnosis">
                  <div id="diagnosisContent" dangerouslySetInnerHTML={{__html: renderDiagnosis()}}></div>
                </div>
                {/* ChatInputPanel 固定在底部 */}
                <div className="chat-input-wrapper">
                  <ChatInputPanel ctrl={new AbortController()} />
                </div>
              </div>
            </div>
          </div>
          
          <div className="right-panel card">
            <div className="log-section">
              <h2>📋 日志与指标解析</h2>
              <div className="log-content">
                <div id="logContent" dangerouslySetInnerHTML={{__html: renderLogAnalysis()}}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
