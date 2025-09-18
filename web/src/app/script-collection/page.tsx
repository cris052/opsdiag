'use client';

import React, { useState, useEffect } from 'react';
import ChatInputPanel from '@/components/chat/input/chat-input-panel';

export default function ScriptCollectionPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [thinkMode, setThinkMode] = useState('collapsed');

  // 模拟脚本生成数据
  const scriptResults = [
    {
      id: 1,
      title: "思考过程",
      tags: ["think"],
      body: "需要补充更自动化的采集脚本，覆盖连通性（ping/traceroute）、KVM/OVS 状态、路由/iptables、防火墙和服务健康，并以结构化输出；必要时使用 -b 提权。",
      isThink: true
    },
    {
      id: 2,
      title: "日志查询脚本",
      tags: ["commands"],
      body: `ansible -i /apps/xunjian/work/bcec/hosts 10.88.4.65 -m shell -a "journalctl -u nova-compute --since '1 hour ago' --no-pager'"
ansible -i /apps/xunjian/work/bcec/hosts 10.88.4.65 -m shell -a "grep -i 'error\\|fail' /var/log/neutron/*"
ansible -i /apps/xunjian/work/bcec/hosts 10.88.4.65 -m shell -a "tail -n 150 /var/log/cinder/volume.log"
ansible -i /apps/xunjian/work/bcec/hosts 10.88.4.65 -m shell -a "grep -i '401 Unauthorized' /var/log/keystone/keystone.log"
ansible -i /apps/xunjian/work/bcec/hosts 10.88.4.65 -m shell -a "tail -n 100 /var/log/glance/glance-api.log"`,
      isThink: false
    },
    {
      id: 3,
      title: "性能监控脚本",
      tags: ["commands"],
      body: `ansible -i /apps/xunjian/work/bcec/hosts 10.88.4.65 -m shell -a "vmstat 1 2"
ansible -i /apps/xunjian/work/bcec/hosts 10.88.4.65 -m shell -a "sar -u 1 5"
ansible -i /apps/xunjian/work/bcec/hosts 10.88.4.65 -m shell -a "iostat -x 1 5"
ansible -i /apps/xunjian/work/bcec/hosts 10.88.4.65 -m shell -a "nvidia-smi"  # 若为GPU节点
ansible -i /apps/xunjian/work/bcec/hosts 10.88.4.65 -m shell -a "systemctl is-failed"`,
      isThink: false
    },
    {
      id: 4,
      title: "网络拓扑查询脚本",
      tags: ["commands"],
      body: `ansible -i /apps/xunjian/work/bcec/hosts 10.88.4.65 -m shell -a "openstack network list"
ansible -i /apps/xunjian/work/bcec/hosts 10.88.4.65 -m shell -a "openstack subnet list"
ansible -i /apps/xunjian/work/bcec/hosts 10.88.4.65 -m shell -a "ovs-ofctl dump-flows br-int"
ansible -i /apps/xunjian/work/bcec/hosts 10.88.4.65 -m shell -a "virsh list --all"
ansible -i /apps/xunjian/work/bcec/hosts 10.88.4.65 -m shell -a "ip netns exec qdhcp-<network-id> arp -a"`,
      isThink: false
    }
  ];

  // 其他Agent结果数据
  const otherResults = [
    {
      id: 1,
      agent: "planner",
      title: "规划器分析结果",
      tags: ["json", "steps"],
      body: `{"locale":"zh-CN","has_enough_context":false,"thought":"用户报告广州宿主机10.88.4.65上的虚拟机无法连接。需要收集更多上下文信息以进行彻底的故障排除。","title":"广州宿主机10.88.4.65上的虚拟机无法连接的故障排除","steps":[{"need_search":true,"title":"检索宿主机和虚拟机的网络配置和状态","description":"需要收集宿主机10.88.4.65的网络接口配置（如IP地址、子网掩码、网关、路由表）、虚拟机的网络配置（如虚拟交换机设置、IP分配、防火墙规则）、以及相关的网络状态信息（如ARP表、ICMP响应、TCP连接状态）。此外，还需检查虚拟化平台（如VMware、KVM、Hyper-V）的特定配置和日志，以确定是否存在虚拟机管理程序级别的网络问题。","step_type":"rag_retrieval","execution_res":"none"},{"need_search":false,"title":"生成脚本以收集虚拟机和宿主机的系统日志和性能指标","description":"需要生成脚本以收集宿主机和虚拟机的系统日志（如/var/log/messages、/var/log/syslog、Windows事件日志）、虚拟化平台日志（如VMware的vpxd日志、KVM的libvirt日志）、以及性能指标（如CPU、内存、磁盘I/O、网络吞吐量）。此外，还需收集虚拟机的启动日志、虚拟机管理程序的连接状态、以及可能的错误代码或异常信息。","step_type":"script_generate","execution_res":"none"}]}`
    },
    {
      id: 2,
      agent: "rag_container",
      title: "RAG检索结果",
      tags: ["rag_retrieval"],
      body: "需要收集宿主机与虚拟机网络配置、状态与虚拟化平台日志等，详见上一步骤说明。"
    },
    {
      id: 6,
      agent: "script_container",
      title: "脚本容器处理",
      tags: ["script_generate"],
      body: "生成脚本收集系统日志、虚拟化平台日志与性能指标（CPU/内存/磁盘I/O/网络），并抓取启动日志与Hypervisor连接状态。"
    },
    {
      id: 3,
      agent: "script_container_sql",
      title: "ECS数据库查询",
      tags: ["SQL", "ECS"],
      body: "select * from ECS.project where project_name = %s"
    },
    {
      id: 5,
      agent: "script_container_sql",
      title: "CMDB数据库查询",
      tags: ["SQL", "CMDB"],
      body: `SELECT 
    d.\`项目名称\`,
    d.\`子系统名称\`,
    d.\`内存配置-总量\`,
    d.\`内存配置-大小\`,
    d.\`CPU配置(物理核)-数量\`,
    d.\`网卡-配置\`,
    d.\`管理ip\`,
    d.\`TOR1\`,
    d.\`TOR2\`,
    n.\`管理ip\` AS 网络设备ip,
    n.\`设备类型\`,
    n.\`网络层次\`
FROM 
    \`device\` d
LEFT JOIN 
    \`network\` n
    ON (n.\`用途描述\` = d.\`TOR1\`)
    AND n.\`项目名称\` LIKE %s
WHERE 
    d.\`项目名称\` LIKE %s 
    AND d.\`管理ip\` = %s;`
    },
    {
      id: 7,
      agent: "script_container_sql",
      title: "ECS数据库查询结果",
      tags: ["SQL", "ECS", "result"],
      body: `{'id': 1, 'project_name': '长春', 'bcec_group': 'harbor-sealer、k8s-master、k8s-node、nova-api、nova-compute、keystone、cinder-api、cinder-volume、glance、manila、HAproxy、amqp、bcmysql、bcmysql-manager、bcmysql-vip', 'os_group': 'basic、storage、nova-compute', 'bms_group': '', 'ansible_node': '10.88.2.9', 'log_rule': 'nova:/var/log/nova/\\ncinder:/var/log/cinder/\\n组件日志每日做一次切分，切分前格式nova-compute.log、切分后格式nova-compute.log-20250404.gz'}`
    },
    {
      id: 4,
      agent: "rag_container_searcher",
      title: "知识库检索结果",
      tags: ["KB", "排障案例"],
      body: `（多条长文本，节选若干重点）
- 时钟不同步导致产品部署失败 → 建议核对 NTP（例：ntpdate -u 10.88.2.137）
- VNC 协议配置错误（https 改为 http）导致控制台访问失败
- Bond 子卡未识别导致网络不通 → 重启网卡/节点恢复
- MAC 漂移因迁移动作残留 UUID → 清理残留
- 容器侧 TCP RST → nf_conntrack_tcp_be_liberal = 1
- 系统盘 I/O 错误导致开机卡住 → 排查宿主磁盘/更换故障盘`
    }
  ];

  const handleClear = () => {
    setSearchQuery('');
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('已复制到剪贴板');
    });
  };

  const handleCopyAll = () => {
    const scriptContent = scriptResults
      .filter(item => thinkMode !== 'hidden' || !item.isThink)
      .map(item => item.body)
      .join('\n\n---\n\n');
    
    const otherContent = otherResults
      .map(item => item.body)
      .join('\n\n---\n\n');
    
    const allContent = `=== 脚本生成结果 ===\n${scriptContent}\n\n=== 其他Agent结果 ===\n${otherContent}`;
    handleCopyText(allContent);
  };

  const getDotClass = (agent: string) => {
    if (agent === 'planner') return 'planner';
    if (agent.startsWith('rag')) return 'rag';
    if (agent.startsWith('script_container_sql')) return 'sql';
    if (agent.startsWith('script')) return 'script';
    if (agent === 'interrupt') return 'search';
    return 'general';
  };

  const needsCode = (text: string) => {
    if (!text) return false;
    return /(^\s*\{[\s\S]*\}\s*$)|(^\s*select\s+)|(^\s*ansible\s+-i\b)|(^\s*SELECT\s+)/im.test(text) || text.includes("\n");
  };

  const filteredScriptResults = scriptResults.filter(item => {
    if (thinkMode === 'hidden' && item.isThink) return false;
    if (!searchQuery) return true;
    
    try {
      const reg = new RegExp(searchQuery, 'i');
      return reg.test(item.title) || reg.test(item.body);
    } catch (e) {
      return (item.title + item.body).includes(searchQuery);
    }
  });

  const filteredOtherResults = otherResults.filter(item => {
    if (!searchQuery) return true;
    
    try {
      const reg = new RegExp(searchQuery, 'i');
      return reg.test(item.title) || reg.test(item.body);
    } catch (e) {
      return (item.title + item.body).includes(searchQuery);
    }
  });

  return (
    <>
      <style jsx global>{`
        :root{
          --bg:#ffffff; --panel:#ffffff; --muted:#5f6b7b; --text:#1c2333; --accent:#2b6cff; --ring:#a8c0ff;
          --ok:#1f9d55; --warn:#b58900; --err:#e02424; --chip:#f3f6ff; --border:#e6e9f2; --code:#f7f9ff;
          --think:#f2f6ff; --think-border:#c8d6ff;
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
        
        /* 新的左右分栏布局 */
        .main-grid{display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-top:2px; height: calc(100vh - 50px)}
        .left-panel.card{padding:0; display:flex; flex-direction:column; height: 100%; overflow: hidden}
        .right-panel.card{padding:0; display:flex; flex-direction:column; height: 100%; overflow: hidden}
        
        /* 左侧脚本生成区域样式 */
        .script-section{display:flex; flex-direction:column; height:100%; padding:16px; padding-bottom:0}
        .script-section h2{font-size:16px; margin:0 0 12px 0; color:var(--accent); border-bottom:2px solid var(--border); padding-bottom:8px; flex-shrink:0}
        .script-content{flex:1; display:flex; flex-direction:column; min-height:0}
        
        /* ChatInputPanel 包装器样式 */
        .chat-input-wrapper{padding:0; padding-right:4px; padding-bottom:16px; flex-shrink:0}
        .scrollable-script{flex:1; overflow-y:auto; min-height:0; padding-right:4px}
        .scrollable-script::-webkit-scrollbar{width:6px}
        .scrollable-script::-webkit-scrollbar-track{background:transparent}
        .scrollable-script::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.1); border-radius:3px}
        .scrollable-script::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,0.2)}
        .script-item{border:1px solid var(--border); border-radius:12px; padding:12px; margin-bottom:12px; background:#fff}
        .script-item.think{background:var(--think); border:1px dashed var(--think-border)}
        .script-item h3{margin:0 0 8px 0; font-size:14px; font-weight:600; color:var(--accent)}
        .script-item .tags{display:flex; gap:6px; margin-bottom:8px}
        .script-item .content{white-space:pre-wrap; word-break:break-word; font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace; font-size:12.5px; background:var(--code); padding:10px; border-radius:8px; border:1px solid var(--border)}
        
        /* 右侧其他Agent区域样式 */
        .other-agents{display:flex; flex-direction:column; height:100%; padding:16px; padding-bottom:0}
        .other-agents h2{font-size:16px; margin:0 0 12px 0; color:var(--accent); border-bottom:2px solid var(--border); padding-bottom:8px; flex-shrink:0}
        .other-content{flex:1; display:flex; flex-direction:column; min-height:0}
        .scrollable-other{flex:1; overflow-y:auto; min-height:0; padding-right:4px}
        .scrollable-other::-webkit-scrollbar{width:6px}
        .scrollable-other::-webkit-scrollbar-track{background:transparent}
        .scrollable-other::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.1); border-radius:3px}
        .scrollable-other::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,0.2)}
        .agent-row{display:flex; gap:12px; margin-bottom:12px; flex-wrap:wrap}
        .agent-item{flex:1; min-width:280px; border:1px solid var(--border); border-radius:12px; padding:12px; background:#fff}
        .agent-header{display:flex; align-items:center; gap:8px; margin-bottom:8px}
        .agent-title{font-weight:600; font-size:14px}
        .agent-content{font-size:13px; line-height:1.5; white-space:pre-wrap; word-break:break-word}
        .agent-content.code{background:var(--code); padding:8px; border-radius:6px; font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace; font-size:12px}
        
        /* 通用样式 */
        .tag{font-size:12px; padding:2px 8px; border-radius:999px; border:1px solid var(--border); color:var(--muted); background:#fff}
        .think-badge{background:var(--think); color:var(--accent); font-weight:600; padding:2px 6px; border-radius:4px; font-size:11px}
        .dot{width:10px;height:10px;border-radius:50%; margin-right:6px}
        .dot.planner{background:linear-gradient(45deg,#7dd3fc,#60a5fa)}
        .dot.rag{background:linear-gradient(45deg,#a78bfa,#60a5fa)}
        .dot.script{background:linear-gradient(45deg,#34d399,#10b981)}
        .dot.sql{background:linear-gradient(45deg,#fbbf24,#ef4444)}
        .dot.search{background:linear-gradient(45deg,#f472b6,#f59e0b)}
        .dot.general{background:linear-gradient(45deg,#94a3b8,#64748b)}
        
        .footer{opacity:.7; text-align:center; padding:14px 0; font-size:12px}
        @media (max-width:1200px){ .main-grid{grid-template-columns:1fr} }
      `}</style>
      
      <div className="app">

        <div className="main-grid">
          <div className="left-panel card">
            <div className="script-section">
              <h2>🔧 脚本生成结果</h2>
              <div className="script-content">
                <div className="scrollable-script">
                  {filteredScriptResults.length > 0 ? (
                    filteredScriptResults.map((item) => (
                      <div key={item.id} className={`script-item ${item.isThink ? 'think' : ''}`}>
                        <h3>{item.isThink ? '🧠 ' : ''}{item.title}</h3>
                        <div className="tags">
                          {item.tags.map((tag, index) => (
                            <span key={index} className="tag">#{tag}</span>
                          ))}
                        </div>
                        <div className="content">{item.body}</div>
                        <div style={{marginTop: '8px'}}>
                          <button className="btn" onClick={() => handleCopyText(item.body)}>复制内容</button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{textAlign: 'center', opacity: 0.7, padding: '20px'}}>暂无脚本生成结果</div>
                  )}
                </div>
                {/* ChatInputPanel 固定在底部 */}
                <div className="chat-input-wrapper">
                  <ChatInputPanel ctrl={new AbortController()} />
                </div>
              </div>
            </div>
          </div>
          
          <div className="right-panel card">
            <div className="other-agents">
              <h2>🤖 其他Agent结果</h2>
              <div className="other-content">
                <div className="scrollable-other">
                  {filteredOtherResults.length > 0 ? (
                    filteredOtherResults.map((item) => (
                      <div key={item.id} className="agent-row">
                        <div className="agent-item">
                          <div className="agent-header">
                            <span className={`dot ${getDotClass(item.agent)}`}></span>
                            <span className="agent-title">{item.title}</span>
                          </div>
                          <div className="tags" style={{marginBottom: '8px'}}>
                            {item.tags.map((tag, index) => (
                              <span key={index} className="tag">#{tag}</span>
                            ))}
                          </div>
                          <div className={`agent-content ${needsCode(item.body) ? 'code' : ''}`}>
                            {item.body}
                          </div>
                          <div style={{marginTop: '8px'}}>
                            <button className="btn" onClick={() => handleCopyText(item.body)}>复制</button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{textAlign: 'center', opacity: 0.7, padding: '20px'}}>暂无其他Agent结果</div>
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
