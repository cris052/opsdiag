'use client';

import React, { useState, useEffect, useRef } from 'react';
import ChatInputPanel from '@/components/chat/input/chat-input-panel';

export default function ScriptCollectionPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [thinkMode, setThinkMode] = useState('collapsed');
  // 发送前不展示脚本与其他Agent内容
  const [hasSent, setHasSent] = useState(false);
  // 记录当前的诊断类型
  const [diagnosisType, setDiagnosisType] = useState<'storage' | 'network'>('storage');
  const [isSecondInput, setIsSecondInput] = useState(false); // 标记是否为二次输入
  // 用于“流式”展示的可见数据（只存id顺序）
  const [visibleScriptIds, setVisibleScriptIds] = useState<number[]>([]);
  const [visibleOtherIds, setVisibleOtherIds] = useState<number[]>([]);
  // 按id记录当前已流式的内容
  const [scriptBodies, setScriptBodies] = useState<Record<number, string>>({});
  const [otherBodies, setOtherBodies] = useState<Record<number, string>>({});
  
  // 滚动容器引用
  const scriptScrollRef = useRef<HTMLDivElement>(null);
  const otherScrollRef = useRef<HTMLDivElement>(null);

  // 根据诊断类型获取脚本数据
  const getScriptResults = () => {
    if (diagnosisType === 'network') {
      return getNetworkScriptResults();
    } else {
      return getStorageScriptResults();
    }
  };

  // 根据诊断类型和是否为二次输入获取脚本数据
  const getScriptResultsWithParams = (fileName?: string, date?: string) => {
    if (diagnosisType === 'network') {
      return getNetworkScriptResults();
    } else {
      if (fileName && date) {
        return getStorageScriptWithParams(fileName, date);
      } else {
        return getStorageScriptResults();
      }
    }
  };

  // 根据诊断类型获取其他Agent数据
  const getOtherResults = () => {
    if (diagnosisType === 'network') {
      return getNetworkOtherResults();
    } else {
      return getStorageOtherResults();
    }
  };

  // 生成具体参数的对象存储脚本（二次输入，不包含思考过程）
  const getStorageScriptWithParams = (fileName: string, date: string) => [
    {
      id: 2,
      title: "智能采集脚本",
      tags: ["commands"],
      body: `#!/bin/bash

# 清理旧结果文件
RESULT_FILE="/tmp/result-\$(date +%Y-%m-%d).txt"
> "\$RESULT_FILE"

# 1. 集群状态检查
CLUSTER_MODULES=("apisix" "osd" "mon" "mon_leader" "slb_h" "keepalived")
for module in "\${CLUSTER_MODULES[@]}"; do
    echo "=== \$module 模块状态 ===" >> "\$RESULT_FILE"
    ansible -i /apps/xunjian/work/eos_slb/hosts \$module -m script -a "/root/ds/check_\${module}.sh" | grep -v '^{' | awk '{print \$0}' >> "\$RESULT_FILE"
    echo "" >> "\$RESULT_FILE"
done

# 2. 日志收集
# 转换日期格式
LOG_DATE="${date}"

# 查询apisix访问日志
echo "=== APIsix访问日志===" >> "\$RESULT_FILE"
ansible -i /apps/xunjian/work/eos_slb/hosts apisix -m shell -a "sudo grep '${fileName}' /var/log/apisix/access.log | grep '\$LOG_DATE'" >> "\$RESULT_FILE"
echo "" >> "\$RESULT_FILE"

# 查询ceph慢操作日志
echo "=== Ceph慢操作日志 ===" >> "\$RESULT_FILE"

ansible -i /apps/xunjian/work/eos_slb/hosts mon_leader -m shell -a "sudo grep 'slow' /var/log/ceph/ceph.log | grep '\$LOG_DATE'" >> "\$RESULT_FILE"
echo "" >> "\$RESULT_FILE"

# 输出完成提示
echo "诊断结果已保存到 \$RESULT_FILE"`,
      isThink: false
    },
    {
      id: 3,
      title: "温馨提示",
      tags: ["commands"],
      body: `
根据您反映的故障现象：对象存储上传文件失败，您可以使用以下脚本进行检测：
集群状态是否全部正常（特别是apisix和mon_leader）
日志中是否存在${fileName}上传请求记录
是否存在ceph慢操作日志

执行完成后，请查看/tmp/result-日期.txt文件获取详细诊断结果。`,
      isThink: false
    }
  ];

  // 对象存储诊断脚本数据
  const getStorageScriptResults = () => [
    {
      id: 1,
      title: "思考过程",
      tags: ["think"],
      body: `好的，我现在需要处理用户关于对象存储上传文件失败的问题。用户提供的信息是日期9月7日，文件名test.txt。
    首先，我要按照任务要求来逐步分析。首先，集群概况查询。用户提到要使用ansible检查各个模块的状态。模块包括apisix、osd、mon、mon_leader、slb_h、keepalived。每个模块需要执行对应的检查脚本。原来的命令是ansible -i ... 模块 -m script -a '路径'，但需要优化只输出stdout_lines，避免混乱。可能需要添加json参数或者使用特定的选项来过滤输出。
    例如，使用ansible的-vvv参数可能太详细，但用户要求只取stdout_lines，所以可能需要在脚本里处理输出，或者在ansible命令中加上适当的参数。另外，每个模块的检查脚本可能需要调整，确保只输出状态信息，比如是否存活、是否有错误等。接下来是日志收集。用户需要查询apisix模块的access.log，查找9月7日的test.txt相关请求。
    同时，mon_leader模块的ceph.log中搜索关键字“slow”。需要注意的是，用户可能只提供了日期，所以日志查询需要匹配日期。另外，日志可能需要sudo权限，所以在ansible命令中需要加上become: yes或者使用sudo。例如，ansible命令可能需要添加-b和-B参数来启用sudo。
    此外，时间格式需要转换为“2025-09-07 10:28:41”的格式，如果用户只提供日期，则只匹配日期部分。这里可能需要处理输入的时间，确保格式正确，并在日志中使用grep过滤。然后，编写脚本。脚本需要先清理旧的结果文件，然后执行各个检查并将结果汇总到指定文件。可能需要使用ansible的多个命令，每个模块的检查结果追加到文件中。日志部分需要使用grep和日期参数过滤，可能需要使用awk或sed处理时间格式。
    例如，对于access.log，可能需要使用grep "test.txt"结合日期范围。对于ceph.log，查找包含“slow”的行，并过滤日期。需要确保脚本能够正确处理权限问题，可能需要在ansible命令中添加sudo。另外，所有输出结果需要汇总到/tmp/result-date.txt，每次运行前清理该文件。现在，我需要考虑各个步骤的细节。例如，在集群检查中，每个模块的检查脚本是否返回正确的状态信息。假设check_apisix.sh等脚本会输出模块的健康状态，比如是否运行正常，是否有错误。如果某个模块的状态显示异常，可能需要进一步的诊断。
    此外，日志收集部分需要确保能够找到相关的日志条目，可能需要处理不同的日志格式，例如access.log中的时间戳格式是否匹配用户提供的日期。可能的错误点包括：日期格式转换不正确，导致日志查询失败；ansible命令权限不足，无法访问日志文件；模块的检查脚本路径是否正确；脚本是否正确清理结果文件。此外，需要确保所有模块都被检查到，并且结果正确汇总。总结步骤：首先清理结果文件，然后依次执行各个模块的ansible检查，将结果追加到文件。
    接着，执行日志收集部分，使用grep和日期参数查询apisix和ceph日志，同样将结果追加。最后，生成汇总报告，提示用户查看结果文件。`,
      isThink: true
    },
    {
      id: 2,
      title: "智能采集脚本",
      tags: ["commands"],
      body: `#!/bin/bash

# 清理旧结果文件
RESULT_FILE="/tmp/result-$(date +%Y-%m-%d).txt"
> "$RESULT_FILE"

# 1. 集群状态检查
CLUSTER_MODULES=("apisix" "osd" "mon" "mon_leader" "slb_h" "keepalived")
for module in "\${CLUSTER_MODULES[@]}"; do
    echo "=== \$module 模块状态 ===" >> "\$RESULT_FILE"
    ansible -i /apps/xunjian/work/eos_slb/hosts \$module -m script -a "/root/ds/check_\${module}.sh" | grep -v '^{' | awk '{print \$0}' >> "\$RESULT_FILE"
    echo "" >> "\$RESULT_FILE"
done

# 2. 日志收集
# 转换日期格式
LOG_DATE="<日期>"

# 查询apisix访问日志
echo "=== APIsix访问日志 ===" >> "\$RESULT_FILE"
ansible -i /apps/xunjian/work/eos_slb/hosts apisix -m shell -a "sudo grep <文件名称> /var/log/apisix/access.log | grep '\$LOG_DATE'" >> "\$RESULT_FILE"
echo "" >> "\$RESULT_FILE"

# 查询ceph慢操作日志
echo "=== Ceph慢操作日志 ===" >> "\$RESULT_FILE"

ansible -i /apps/xunjian/work/eos_slb/hosts mon_leader -m shell -a "sudo grep 'slow' /var/log/ceph/ceph.log | grep '\$LOG_DATE'" >> "\$RESULT_FILE"
echo "" >> "\$RESULT_FILE"

# 输出完成提示
echo "诊断结果已保存到 \$RESULT_FILE"`,
      isThink: false
    },
    {
      id: 3,
      title: "温馨提示",
      tags: ["commands"],
      body: `
根据您反映的故障现象：对象存储上传文件失败，您可以使用以下脚本进行检测：
集群状态是否全部正常（特别是apisix和mon_leader）
日志中是否存在test.txt上传请求记录
是否存在慢操作日志与上传时间吻合`,
      isThink: false
    },
    {
      id: 4,
      title: "二次输入",
      tags: ["commands"],
      body: `请补充对象存储文件名称完善脚本内容`,
      isThink: false
    }
  ];

  // 网络诊断脚本数据
  const getNetworkScriptResults = () => [
    {
      id: 1,
      title: "思考过程",
      tags: ["think"],
      body: `好的，我现在需要处理用户关于云主机外网访问不通的问题。用户提供了云主机的UUID、外网IP、源IP、协议和端口信息。我需要按照步骤一步步诊断。
  首先，任务要求第一步是查询当天最新的巡检结果。用户给出的命令是用ls -t列出20250927目录下的txt文件，取最新的一个并用cat查看。这一步应该没问题，但需要确认路径是否正确，是否有权限访问。
  接下来是第二步，通过ansible执行ovs-check。这里需要确定计算节点的host_ip地址。用户提到需要根据云主机详情中的host_ip来指定计算节点。假设云主机详情中的host_ip是某个计算节点的IP，比如192.168.x.x。这时候需要用ansible的hosts文件中的对应节点执行命令。需要确保ansible的hosts文件配置正确，并且有权限在计算节点上执行sudo命令。
  第三步是针对特定TCP端口的情况。比如目的端口是80、443等，这时候需要执行toolscheck_fip_block.sh脚本。这里需要确认用户提供的云主机公网IP是否正确，并且脚本路径是否正确。如果用户给出的云主机公网IP是183.240.140.27，那么命令应该正确执行。
  第四步是关于其他端口或ICMP协议的情况。需要使用get_vsw_flowtable.sh脚本查询流入和流出方向的流表。这里需要注意参数是否正确，尤其是ICMP协议时不需要-d参数。需要确保脚本路径正确，并且参数传递无误。
  第五步是抓包，使用ovs-tcpdump在计算节点上抓取来自源IP的数据包。需要确保ovs-tcpdump命令可用，并且有足够的时间捕获数据包。如果抓到了包，说明数据包已经到达云主机，问题可能在云主机内部配置；如果没抓到，则需要检查中间网络。
  第六步是根据抓包结果判断下一步。如果抓到包且流表未drop，说明问题在内部；否则检查中间网络和安全资源池。这部分需要用户自行处理，但可能需要指导用户如何检查云主机内部配置或联系网络团队。
  第七步是编写脚本汇总结果到指定文件。需要确保每次执行前清空文件，并将各个步骤的输出重定向到该文件。要注意脚本中的变量替换，比如用实际的UUID、IP等参数替换占位符。同时，脚本需要处理不同的协议和端口情况，可能需要条件判断。`,
      isThink: true
    },
    {
      id: 2,
      title: "网络诊断脚本",
      tags: ["commands"],
      body: `#!/bin/bash

# 清空结果文件
OUTPUT_FILE="/tmp/result-\$(date +%Y%m%d).txt"
> "\$OUTPUT_FILE"

# 变量定义（示例值，需根据实际输入替换）
UUID="6fe57e66-4583-467a-8e3b-6ac2f9226ac8"
FIP="183.240.140.27"
SRC_IP="221.176.33.29"
PROTO="ICMP"
HOST_IP="192.168.1.100"  # 计算节点IP（需根据实际云主机详情填写）
DATE="20250927"

# 1. 查询最新巡检结果
echo "=== 1. 最新巡检结果 ===" >> "\$OUTPUT_FILE"
ls -t /apps/xunjian/result/\$DATE/*.txt | head -n 1 | xargs cat >> "\$OUTPUT_FILE"

# 2. OVS状态诊断
echo "=== 2. OVS状态检查 ===" >> "\$OUTPUT_FILE"
ansible -i /apps/xunjian/work/tianchi/hosts "\$HOST_IP" -m shell -a "sudo ovs-helper ovs-check" >> "\$OUTPUT_FILE" 2>&1

# 3. 特定端口检查（如HTTP/HTTPS等）
if [[ "\$PROTO" == "TCP" && ("\$DST_PORT" == "80" || "\$DST_PORT" == "443" || "\$DST_PORT" == "8080" || "\$DST_PORT" == "8443") ]]; then
    echo "=== 3. FIP阻断检查 ===" >> "\$OUTPUT_FILE"
    ansible -i /apps/xunjian/work/tianchi/hosts "\$HOST_IP" -m shell -a "sh /apps/ecs_tools/scripts/toolscheck_fip_block.sh -a check_fip_block \$FIP" >> "\$OUTPUT_FILE" 2>&1
fi

# 4. 流表查询
if [[ "\$PROTO" == "ICMP" ]]; then
    echo "=== 4. ICMP流表检查 ===" >> "\$OUTPUT_FILE"
    ansible -i /apps/xunjian/work/tianchi/hosts "\$HOST_IP" -m shell -a "/apps/ecs_tools/scripts/get_vsw_flowtable.sh -u \$UUID -p icmp -i \$SRC_IP -r in" >> "\$OUTPUT_FILE" 2>&1
    ansible -i /apps/xunjian/work/tianchi/hosts "\$HOST_IP" -m shell -a "/apps/ecs_tools/scripts/get_vsw_flowtable.sh -u \$UUID -p icmp -i \$FIP -r out" >> "\$OUTPUT_FILE" 2>&1
else
    echo "=== 4. TCP/UDP流表检查 ===" >> "\$OUTPUT_FILE"
    ansible -i /apps/xunjian/work/tianchi/hosts "\$HOST_IP" -m shell -a "/apps/ecs_tools/scripts/get_vsw_flowtable.sh -u \$UUID -p \$PROTO -i \$SRC_IP -r in -d \$DST_PORT" >> "\$OUTPUT_FILE" 2>&1
    ansible -i /apps/xunjian/work/tianchi/hosts "\$HOST_IP" -m shell -a "/apps/ecs_tools/scripts/get_vsw_flowtable.sh -u \$UUID -p \$PROTO -i \$FIP -r out -d \$DST_PORT" >> "\$OUTPUT_FILE" 2>&1
fi

# 5. 计算节点抓包
echo "=== 5. 抓包诊断 ===" >> "\$OUTPUT_FILE"
ansible -i /apps/xunjian/work/tianchi/hosts "\$HOST_IP" -m shell -a "sudo timeout 30 ovs-tcpdump -i br-phy -ee -vv -nn | grep \$SRC_IP" >> "\$OUTPUT_FILE" 2>&1

# 6. 诊断结论
echo "=== 6. 诊断结论 ===" >> "\$OUTPUT_FILE"
if grep -q "0 packets captured" "\$OUTPUT_FILE"; then
    echo "未捕获到数据包，需检查客户端到计算节点的网络连通性及安全资源池配置" >> "\$OUTPUT_FILE"
else
    echo "数据包已到达计算节点，建议检查云主机内部防火墙配置" >> "\$OUTPUT_FILE"
fi

echo "诊断结果已保存至 \$OUTPUT_FILE"`,
      isThink: false
    },
    {
      id: 3,
      title: "温馨提示",
      tags: ["commands"],
      body: `使用说明：
1. 权限要求：
   - 需在ansible控制节点执行
   - 需具备sudo权限执行ovs相关命令
   - 需确保计算节点在 /apps/xunjian/work/tianchi/hosts 中配置

2. 执行方式：
   ## bash
   chmod +x network_diag.sh
   ./network_diag.sh
   ##

3. 变量替换：您需要输入以下变量值：
   - \`UUID\`: 云主机UUID
   - \`FIP\`: 云主机公网IP
   - \`SRC_IP\`: 源IP地址
   - \`PROTO\`: 协议类型（TCP/UDP/ICMP）
   - \`HOST_IP\`: 云主机所在计算节点IP
   - \`DST_PORT\`: 目标端口号（TCP/UDP场景）
   - \`DATE\`: 当前日期（格式YYYYMMDD）`,
      isThink: false
    }
  ];

  // 对象存储诊断的其他Agent数据
  const getStorageOtherResults = () => [
    {
      id: 1,
      agent: "planner",
      title: "规划器分析结果",
      tags: ["json", "steps"],
      body: `{"用户报告对象存储上传文件失败，需要收集更多上下文信息来诊断问题。", "title": "对象存储上传文件失败诊断", "steps": [{"need_search": true, "title": "检索相关故障报告和解决方案", "description": "可能性最高的初步分析结果是网络问题、权限配置错误或存储服务不可用。需要收集以下数据：
      1. 最近的故障报告中是否有类似问题记录；
      2. 当前网络连接状态和防火墙设置；
      3. 存储服务的可用性和健康状态；
      4. 用户权限配置和访问控制列表（ACL）设置；
      5. 上传文件时的具体错误日志和HTTP状态码。", "step_type": "rag_retrieval", "execution_res": null}, {"need_search": false, "title": "生成脚本收集系统日志和配置信息", "description": "可能性最高的初步分析结果是系统配置错误或资源限制导致上传失败。需要生成脚本收集以下信息：
        1. 操作系统日志（/var/log/messages或syslog）；
        2. 存储客户端配置文件（如AWS CLI配置）；
        3. 当前系统资源使用情况（CPU、内存、磁盘空间）；
        4. 网络接口配置和路由表；
        5. 存储服务的API调用日志和响应时间。]}`
    },
    {
      id: 2,
      agent: "rag_container",
      title: "RAG检索结果",
      tags: ["rag_retrieval"],
      body: `{"title":"检索相关故障报告和解决方案","description":"可能性最高的初步分析结果是网络问题、权限配置错误或存储服务不可用。需要收集以下数据：1. 最近的故障报告中是否有类似问题记录；2. 当前网络连接状态和防火墙设置；3. 存储服务的可用性和健康状态；4. 用户权限配置和访问控制列表（ACL）设置；5. 上传文件时的具体错误日志和HTTP状态码。","step_type":"rag_retrieval","execution_res":null}`
    },
    {
      id: 6,
      agent: "script_container",
      title: "脚本容器处理",
      tags: ["script_generate"],
      body: `{"need_search":false,"title":"生成脚本收集系统日志和配置信息","description":"可能性最高的初步分析结果是系统配置错误或资源限制导致上传失败。需要生成脚本收集以下信息：
      1. 操作系统日志（/var/log/messages或syslog）；
      2. 存储客户端配置文件（如AWS CLI配置）；
      3. 当前系统资源使用情况（CPU、内存、磁盘空间）；
      4. 网络接口配置和路由表；5. 存储服务的API调用日志和响应时间。}`
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
      body: `{'id': 1, 'project_name': '长春', 'bcec_group': 'harbor-sealer、k8s-master、k8s-node、nova-api、nova-compute、keystone、cinder-api、cinder-volume、glance、manila、HAproxy、amqp、bcmysql、bcmysql-manager、bcmysql-vip', 'os_group': 'basic、storage、nova-compute', 'bms_group': '', 'ansible_node': '10.88.2.9', 'log_rule': 'nova:/var/log/nova/\ncinder:/var/log/cinder/\n组件日志每日做一次切分，切分前格式nova-compute.log、切分后格式nova-compute.log-20250404.gz'}`
    },
    {
      id: 4,
      agent: "rag_container_searcher",
      title: "知识库检索结果",
      tags: ["KB", "排障案例"],
      body: `当用户上传文件报错403时，可以按照以下步骤进行排查：

1. 检查ak sk是否正确 
   - 执行命令：'radosgw-admin user info --uid=xxx'  
   - 确认用户状态是否正常，配额是否超限，以及ak sk是否配置错误。  

2. 检查日志  
   - 执行命令：  
     - 'cat /var/log/apisix/access.log'  
     - 'cat /var/log/apisix/error.log'  
     - 'cat /var/log/ceph/xxx.rgwx.log'  
   - 这些命令仅用于查询日志，不涉及配置变更，无需提醒。

3. 调高日志级别 
   - 执行命令：'ceph daemon /var/run/ceph/xxx.asok config set debug_rgw 20/20'  
   - 该操作涉及配置修改，需要按照流程制度中的流程执行。

4. 修改对象存储白名单
   - 执行命令：  
     - 'vim /etc/ceph/ceph.conf'（在配置文件末尾添加 'rgw_remote_addr_param = HTTP_X_FORWARDED_FOR'）  
     - 'systemctl restart ceph-radosgw@rgw.xxxx'  
   - 上述操作涉及配置修改，需要按照流程制度中的流程执行。

5. 修改对象存储用户容量限制
   - 登录对象存储管理网节点，执行相关操作前需确认用户信息。  
   - 若需要修改用户容量限制，需按照流程制度中的流程执行。

6. 执行健康检查  
   - 执行命令：  
     - 'show power'  
     - 'show interfaces brief'  
     - 'show switch virtual role'  
   - 上述命令仅用于查询设备状态，不涉及配置变更，无需提醒。

7. 升级对象存储版本  
   - 执行命令：  
     - 'rpm -qa | grep ceph-radosgw > /tmp/eos_old_version'  
     - 'mkdir -p /apps/base/yumserver/eos-8.13.7_h2'  
     - 'unzip xxx.zip && mv * /apps/base/yumserver/eos-8.13.7_h2'  
     - 'createrepo ./'  
     - 'chmod -R 755 /apps/base/yumserver/eos-8.13.7_h2'  
     - 'yum clean all && yum makecache'  
     - 'yum list | grep ceph-radosgw'  
   - 上述操作涉及配置修改和文件操作，需要按照流程制度中的流程执行。

8. 执行rgw升级  
   - 执行命令：  
     - 'ipvsadm -ln'  
   - 该操作涉及配置修改，需要按照流程制度中的流程执行。


----对象存储产品日常维护和常见问题讲解.pptx
----ECS项目BC-EOS产品SOP手册.docx
----ECS项目通用操作类SOP手册.docx`
    }
  ];

  // 网络诊断的其他Agent数据
  const getNetworkOtherResults = () => [
    {
      id: 1,
      agent: "planner",
      title: "规划器分析结果",
      tags: ["json", "steps"],
      body: `{"用户报告外网无法访问云主机，这可能涉及多个层面的问题，包括网络配置、防火墙规则、路由设置、云服务提供商的限制等。需要收集更多数据来确定根本原因。","title":"外网访问云主机网络不通",
      "title":"检索云主机网络配置和防火墙规则","description":"需要检查云主机的网络配置，包括IP地址、子网掩码、网关和DNS设置。同时，需要查看防火墙规则，确保没有阻止外网访问的规则。此外，还需检查云服务提供商的安全组配置，确保允许外网流量。
      "title":"生成脚本检查网络连通性和路由表","description":"生成一个脚本，用于检查云主机的网络连通性，包括使用ping、traceroute和telnet等命令测试与外网的连接。同时，检查路由表以确保正确的路由配置。此外，检查云主机的路由表，确保有正确的默认路由和静态路由配置。"}]}`
    },
    {
      id: 2,
      agent: "rag_container",
      title: "RAG检索结果",
      tags: ["rag_retrieval"],
      body: `{"title":"检索云主机网络配置和防火墙规则","description":"需要检查云主机的网络配置，包括IP地址、子网掩码、网关和DNS设置。同时，需要查看防火墙规则，确保没有阻止外网访问的规则。此外，还需检查云服务提供商的安全组配置，确保允许外网流量。"}`
    },
    {
      id: 3,
      agent: "script_container",
      title: "脚本容器处理",
      tags: ["script_generate"],
      body: `{""title":"生成脚本检查网络连通性和路由表","description":"生成一个脚本，用于检查云主机的网络连通性，包括使用ping、traceroute和telnet等命令测试与外网的连接。同时，检查路由表以确保正确的路由配置。此外，检查云主机的路由表，确保有正确的默认路由和静态路由配置。"}`
    },
    {
      id: 6,
      agent: "rag_container_searcher",
      title: "知识库检索结果",
      tags: ["KB", "网络故障案例"],
      body: `## 一、故障现象  
1. 甘肃天水政务外网资源池云主机宕机（2025-01-06 18:28-21:25）  
   - 云主机172.101.7.21、172.101.7.31、172.101.5.4、172.101.8.17宕机告警，迁移后恢复。  
   - 网络测试显示DPDKbond到SDNFW间存在丢包，底层流量正常但操作系统层丢包。  

2. 临沂政务云12345业务havip丢包（2025-02-08 07:08-09:50）  
   - havip地址40%-50%丢包，业务电话不通。  
   - 根因定位为ARM环境JDK8版本bug导致天池SDN组件异常，apiserver频繁刷新引发丢包。  

### 二、故障根因分析  
#### 1. 关联性前三原因  
1. SDN组件异常  
   - 甘肃事件中DPDKbond到SDNFW丢包；  
   - 临沂事件中天池SDN因JDK版本问题导致apiserver刷新异常。  
   - 关联概率：90%（两者均涉及SDN层网络异常）。  

2. 云主机迁移操作配置异常  
   - 甘肃事件中云主机迁移触发宿主机资源不足及网络配置冲突。  
   - 关联概率：70%（迁移操作可能间接影响SDN组件稳定性）。  

3. JDK版本兼容性问题  
   - 临沂事件中ARM环境JDK8版本bug直接导致zk服务异常。  
   - 关联概率：60%（若甘肃事件迁移操作涉及ARM环境，可能隐含版本问题）。  

### 三、改进措施  
1. SDN组件稳定性优化  
   - 升级JDK版本至11，修复ARM环境兼容性问题（临沂事件已实施）。  
   - 增加SDN组件自动化巡检脚本，实时监控丢包及刷新频率。  

2. 云主机迁移规范强化  
   - 迁移前校验宿主机资源及网络配置，避免资源冲突。  
   - 建立迁移后网络连通性快速验证流程。  

3. 底层组件版本管理  
   - 定期梳理ARM环境已知bug，优先升级JDK、SDN等关键组件。  
   - 补充ECS平台产品版本同步机制，确保底层依赖版本一致性。  

### 四、知识库标题  
1. 《云主机迁移后网络异常处理》  
2. 《ARM环境下JDK版本兼容性问题排查指南》  
3. 《天池SDN组件异常刷新导致havip丢包案例分析》  
4. 《DPDK与SDNFW间丢包问题定位方法》`
    },
    {
      id: 4,
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
      id: 5,
      agent: "script_container_sql",
      title: "ECS数据库查询结果",
      tags: ["SQL", "ECS", "result"],
      body: `{'id': 1, 'project_name': '长春', 'bcec_group': 'harbor-sealer、k8s-master、k8s-node、nova-api、nova-compute、keystone、cinder-api、cinder-volume、glance、manila、HAproxy、amqp、bcmysql、bcmysql-manager、bcmysql-vip', 'os_group': 'basic、storage、nova-compute', 'bms_group': '', 'ansible_node': '10.88.2.9', 'log_rule': 'nova:/var/log/nova/\ncinder:/var/log/cinder/\n组件日志每日做一次切分，切分前格式nova-compute.log、切分后格式nova-compute.log-20250404.gz'}`
    },
  ];

  // 处理输入发送，根据内容切换诊断类型
  const handleSend = (message: string) => {
    // 检查是否为二次输入（对象存储参数输入）
    const storageParamsMatch = message.match(/对象存储的文件名称为(.+?)，日期为(\d{8})/);
    
    if (storageParamsMatch && diagnosisType === 'storage' && hasSent) {
      // 二次输入：提取文件名和日期
      const fileName = storageParamsMatch[1].trim();
      const dateStr = storageParamsMatch[2].trim();
      // 转换日期格式：20250927 -> 2025-09-27
      const formattedDate = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;
      
      // 只更新左侧脚本，右侧保持不变
      setIsSecondInput(true);
      startStreamingWithParams('storage', fileName, formattedDate, true);
      return;
    }
    
    // 首次输入逻辑
    let newDiagnosisType: 'storage' | 'network' = 'storage';
    
    if (message.includes("外网无法访问云主机")) {
      newDiagnosisType = 'network';
    } else if (message.includes("对象存储上传文件失败")) {
      newDiagnosisType = 'storage';
    }
    
    setDiagnosisType(newDiagnosisType);
    setIsSecondInput(false);
    
    // 使用新的诊断类型开始流式显示
    startStreamingWithType(newDiagnosisType);
  };

  const handleClear = () => {
    setSearchQuery('');
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('已复制到剪贴板');
    });
  };

  // 自动滚动到指定容器底部
  const scrollToBottom = (scrollRef: React.RefObject<HTMLDivElement>) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  // 将文本按字符“流式”追加；返回 Promise，完成后再处理下一个，确保逐条顺序
  const streamText = (full: string, onChunk: (s: string) => void, speed = 15, scrollRef?: React.RefObject<HTMLDivElement>): Promise<void> => {
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

  // 根据指定的诊断类型获取数据
  const getDataByType = (type: 'storage' | 'network') => {
    if (type === 'network') {
      return {
        scripts: getNetworkScriptResults(),
        others: getNetworkOtherResults()
      };
    } else {
      return {
        scripts: getStorageScriptResults(),
        others: getStorageOtherResults()
      };
    }
  };

  // 根据指定的诊断类型和参数获取数据
  const getDataByTypeWithParams = (type: 'storage' | 'network', fileName?: string, date?: string) => {
    if (type === 'network') {
      return {
        scripts: getNetworkScriptResults(),
        others: getNetworkOtherResults()
      };
    } else {
      return {
        scripts: fileName && date ? getStorageScriptWithParams(fileName, date) : getStorageScriptResults(),
        others: getStorageOtherResults()
      };
    }
  };

  // 使用指定类型开始流式显示
  const startStreamingWithType = (type: 'storage' | 'network') => {
    // 清空并标记
    setHasSent(true);
    setVisibleScriptIds([]);
    setVisibleOtherIds([]);
    setScriptBodies({});
    setOtherBodies({});

    // 根据类型获取源数据
    const { scripts, others } = getDataByType(type);

    // 顺序执行：先右侧，后左侧；每个卡片按字符输出完成后再处理下一个
    (async () => {
      // 右侧其他Agent结果：顺序加入并流式 body
      for (const item of others) {
        setVisibleOtherIds(prev => [...prev, item.id]);
        // 初始化为空，随后按字符推进
        setOtherBodies(prev => ({ ...prev, [item.id]: '' }));
        await streamText(item.body, (chunk) => {
          setOtherBodies(prev => ({ ...prev, [item.id]: chunk }));
        }, 15, otherScrollRef);
      }

      // 左侧脚本结果：顺序加入并流式 body
      for (const item of scripts) {
        setVisibleScriptIds(prev => [...prev, item.id]);
        setScriptBodies(prev => ({ ...prev, [item.id]: '' }));
        await streamText(item.body, (chunk) => {
          setScriptBodies(prev => ({ ...prev, [item.id]: chunk }));
        }, 15, scriptScrollRef);
      }
    })();
  };

  // 使用指定类型和参数开始流式显示
  const startStreamingWithParams = (type: 'storage' | 'network', fileName?: string, date?: string, onlyUpdateScripts = false) => {
    if (!onlyUpdateScripts) {
      // 完整重置
      setHasSent(true);
      setVisibleScriptIds([]);
      setVisibleOtherIds([]);
      setScriptBodies({});
      setOtherBodies({});
    } else {
      // 只重置脚本部分
      setVisibleScriptIds([]);
      setScriptBodies({});
    }

    // 根据类型和参数获取源数据
    const { scripts, others } = getDataByTypeWithParams(type, fileName, date);

    // 顺序执行：先右侧，后左侧；每个卡片按字符输出完成后再处理下一个
    (async () => {
      if (!onlyUpdateScripts) {
        // 右侧其他Agent结果：顺序加入并流式 body
        for (const item of others) {
          setVisibleOtherIds(prev => [...prev, item.id]);
          // 初始化为空，随后按字符推进
          setOtherBodies(prev => ({ ...prev, [item.id]: '' }));
          await streamText(item.body, (chunk) => {
            setOtherBodies(prev => ({ ...prev, [item.id]: chunk }));
          }, 15, otherScrollRef);
        }
      }

      // 左侧脚本结果：顺序加入并流式 body
      for (const item of scripts) {
        setVisibleScriptIds(prev => [...prev, item.id]);
        setScriptBodies(prev => ({ ...prev, [item.id]: '' }));
        await streamText(item.body, (chunk) => {
          setScriptBodies(prev => ({ ...prev, [item.id]: chunk }));
        }, 15, scriptScrollRef);
      }
    })();
  };

  // 兼容原有的 startStreaming 函数
  const startStreaming = () => {
    startStreamingWithType(diagnosisType);
  };

  const handleCopyAll = () => {
    const scriptContent = getScriptResults()
      .filter(item => thinkMode !== 'hidden' || !item.isThink)
      .map(item => item.body)
      .join('\n\n---\n\n');
    
    const otherContent = getOtherResults()
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
    return /(^\s*\{[\s\S]*\}\s*$)|(^\s*select\s+)|(^\s*SELECT\s+)|(^\s*-\s)/im.test(text) || text.includes('\n');
  };

  // 格式化文本中的命令和代码
  const formatCodeInText = (text: string) => {
    if (!text) return text;
    
    // 处理单引号包围的命令
    const formattedText = text.replace(/'([^']+)'/g, '<code class="inline-code">$1</code>');
    
    // 处理反引号包围的代码
    const finalText = formattedText.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    
    return finalText;
  };

  const filteredScriptResults = getScriptResults().filter(item => {
    if (thinkMode === 'hidden' && item.isThink) return false;
    if (!searchQuery) return true;
    
    try {
      const reg = new RegExp(searchQuery, 'i');
      return reg.test(item.title) || reg.test(item.body);
    } catch (e) {
      return (item.title + item.body).includes(searchQuery);
    }
  });

  const filteredOtherResults = getOtherResults().filter(item => {
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
        /* 与 IntelligentScriptsPage 对齐的容器留白设置 */
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
        .btn{border:1px solid var(--border); background:#fff; padding:6px 10px; border-radius:10px; cursor:pointer; font-size:12px}
        .btn:hover{border-color:var(--ring); background:#f7faff}
        
        /* 与 IntelligentScriptsPage 对齐的左右分栏布局 */
        .main-grid{display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin:0 !important; height: calc(100vh - 60px) !important; width:100% !important}
        .left-panel.card{padding:0; display:flex; flex-direction:column; height: 100%; overflow: hidden}
        .right-panel.card{padding:0; display:flex; flex-direction:column; height: 100%; overflow: hidden}
        
        /* 左侧脚本生成区域样式（与诊断页一致） */
        .script-section{display:flex; flex-direction:column; height:100%; padding:8px !important; padding-bottom:0}
        .script-section h2{font-size:16px; margin:0 0 12px 0; color:var(--accent); border-bottom:2px solid var(--border); padding-bottom:8px; flex-shrink:0}
        .script-content{flex:1; display:flex; flex-direction:column; min-height:0}
        
        /* ChatInputPanel 包装器样式（与诊断页一致） */
        .chat-input-wrapper{padding: 0 4px 16px 8px !important; flex-shrink:0}
        .scrollable-script{flex:1; overflow-y:scroll; min-height:0; padding-right:4px; scrollbar-gutter: stable both-edges}
        .scrollable-script::-webkit-scrollbar{width:6px}
        .scrollable-script::-webkit-scrollbar-track{background:transparent}
        .scrollable-script::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.1); border-radius:3px}
        .scrollable-script::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,0.2)}
        .script-item{border:1px solid var(--border); border-radius:12px; padding:12px; margin-bottom:12px; background:#fff; position:relative}
        .script-item.think{background:var(--think); border:1px dashed var(--think-border)}
        .script-item h3{margin:0 0 8px 0; font-size:14px; font-weight:600; color:var(--accent)}
        .script-item .tags{display:flex; gap:6px; margin-bottom:8px}
        .script-item .content{white-space:pre-wrap; word-break:break-word; font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace; font-size:13.5px; background:#f8f9fa; padding:10px; border-radius:8px; border:1px solid var(--border); font-weight:normal; color:#495057}
        
        /* 右侧其他Agent区域样式（与诊断页一致） */
        .other-agents{display:flex; flex-direction:column; height:100%; padding:8px !important; padding-bottom:0}
        .other-agents h2{font-size:16px; margin:0 0 12px 0; color:var(--accent); border-bottom:2px solid var(--border); padding-bottom:8px; flex-shrink:0}
        .other-content{flex:1; display:flex; flex-direction:column; min-height:0}
        .scrollable-other{flex:1; overflow-y:scroll; min-height:0; padding-right:4px; scrollbar-gutter: stable both-edges}
        .scrollable-other::-webkit-scrollbar{width:6px}
        .scrollable-other::-webkit-scrollbar-track{background:transparent}
        .scrollable-other::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.1); border-radius:3px}
        .scrollable-other::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,0.2)}
        .agent-row{display:flex; gap:12px; margin-bottom:12px; flex-wrap:wrap}
        .agent-item{flex:1; min-width:280px; border:1px solid var(--border); border-radius:12px; padding:12px; background:#fff; position:relative}
        .agent-header{display:flex; align-items:center; gap:8px; margin-bottom:8px}
        .agent-title{font-weight:600; font-size:14px}
        .agent-content{font-size:14px; line-height:1.5; white-space:pre-wrap; word-break:break-word}
        .agent-content.code{background:#f8f9fa; padding:8px; border-radius:6px; font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace; font-size:13px; font-weight:normal; color:#495057}
        
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
        
        /* 代码和命令样式增强 */
        .agent-content code, .script-item .content code, .inline-code {
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
        
        .footer{opacity:.7; text-align:center; padding:14px 0; font-size:12px}
        
        @media (max-width:1200px){ .main-grid{grid-template-columns:1fr} }
      `}</style>
      
      <div className="app">

        <div className="main-grid">
          {/* 左侧：脚本生成结果 */}
          <div className="left-panel card">
            <div className="script-section">
              <h2>🔧 脚本生成结果</h2>
              <div className="script-content">
                <div className="scrollable-script" ref={scriptScrollRef}>
                  {!hasSent ? (
                    <div className="script-item" style={{opacity: 0.8}}>
                      <div className="content">请在下方输入后点击发送以生成脚本结果</div>
                    </div>
                  ) : visibleScriptIds.length > 0 ? (
                    visibleScriptIds.map((id: number) => {
                      const item = getScriptResults().find(i => i.id === id)!;
                      const body = scriptBodies[id] || '';
                      return (
                        <div key={id} className={`script-item ${item.isThink ? 'think' : ''}`}>
                          <button className="btn copy-btn-top-right" onClick={() => handleCopyText(body)}>复制</button>
                          <h3>{item.isThink ? '🧠 ' : ''}{item.title}</h3>
                          <div className="tags">
                            {item.tags.map((tag: string, index: number) => (
                              <span key={index} className="tag">#{tag}</span>
                            ))}
                          </div>
                          <div className="content">{body}</div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="script-item" style={{opacity: 0.8}}>
                      <div className="content">暂无脚本生成结果</div>
                    </div>
                  )}
                </div>
                {/* ChatInputPanel 固定在底部 */}
                <div className="chat-input-wrapper">
                  <ChatInputPanel ctrl={new AbortController()} onSend={handleSend} />
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：其他 Agent 结果 */}
          <div className="right-panel card">
            <div className="other-agents">
              <h2>🤖 其他Agent结果</h2>
              <div className="other-content">
                <div className="scrollable-other" ref={otherScrollRef}>
                  {!hasSent ? (
                    <div className="agent-row">
                      <div className="agent-item">
                        <div className="agent-content">发送后将展示其他 Agent 的结果</div>
                      </div>
                    </div>
                  ) : visibleOtherIds.length > 0 ? (
                    visibleOtherIds.map((id: number) => {
                      const item = getOtherResults().find(i => i.id === id)!;
                      const body = otherBodies[id] || '';
                      return (
                        <div key={id} className="agent-row">
                          <div className="agent-item">
                            <button className="btn copy-btn-top-right" onClick={() => handleCopyText(body)}>复制</button>
                            <div className="agent-header">
                              <span className={`dot ${getDotClass(item.agent)}`}></span>
                              <span className="agent-title">{item.title}</span>
                            </div>
                            <div className="tags" style={{marginBottom: '8px'}}>
                              {item.tags.map((tag: string, index: number) => (
                                <span key={index} className="tag">#{tag}</span>
                              ))}
                            </div>
                            <div className={`agent-content ${needsCode(body) ? 'code' : ''}`}>
                              {needsCode(body) ? body : <span dangerouslySetInnerHTML={{__html: formatCodeInText(body)}} />}
                            </div>
                          </div>
                        </div>
                      );
                    })
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
