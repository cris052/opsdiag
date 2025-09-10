import { ChatContentContext } from "@/contexts";
import { BugOutlined } from '@ant-design/icons';
import { Popover, Select, Tooltip } from 'antd';
import React, { memo, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const FaultType: React.FC<{
  faultTypeValue: string;
  setFaultTypeValue: (value: string) => void;
}> = ({ faultTypeValue, setFaultTypeValue }) => {
  const { appInfo, chatInParams, setChatInParams } = useContext(ChatContentContext);
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  // 所有Hooks必须在条件渲染之前调用
  const extendedChatInParams = useMemo(() => {
    return chatInParams?.filter(i => i.param_type !== 'fault_type') || [];
  }, [chatInParams]);

  const fault_type = useMemo(
    () => appInfo?.layout?.chat_in_layout?.find(i => i.param_type === 'fault_type'),
    [appInfo?.layout?.chat_in_layout],
  );

  const paramKey: string[] = useMemo(() => {
    return appInfo?.layout?.chat_in_layout?.map(i => i.param_type) || [];
  }, [appInfo?.layout?.chat_in_layout]);

  const faultTypeOptions = useMemo(() => {
    console.log('故障类型调试信息:', {
      appInfo: appInfo,
      chat_in_layout: appInfo?.layout?.chat_in_layout,
      fault_type: fault_type,
      param_type_options: fault_type?.param_type_options
    });
    
    // 确保返回正确格式的选项数组
    const options = fault_type?.param_type_options || [];
    
    // 如果options是字符串数组，转换为正确的格式
    if (options.length > 0 && typeof options[0] === 'string') {
      return options.map((option: string) => ({
        label: option,
        value: option
      }));
    }
    
    // 如果已经是正确格式，直接返回
    if (options.length > 0 && options[0].label && options[0].value) {
      return options;
    }
    
    // 如果没有选项或格式不正确，返回默认选项
    if (options.length === 0) {
      return [
        { label: '网络故障', value: '网络故障' },
        { label: '存储故障', value: '存储故障' },
        { label: '计算故障', value: '计算故障' }
      ];
    }
    
    return options;
  }, [fault_type?.param_type_options, appInfo]);

  if (!paramKey.includes('fault_type')) {
    return (
      <Tooltip title="故障类型">
        <div className='flex w-8 h-8 items-center justify-center rounded-md hover:bg-[rgb(221,221,221,0.6)] cursor-pointer'>
          <BugOutlined className='text-xl cursor-not-allowed opacity-30' />
        </div>
      </Tooltip>
    );
  }

  const handleFaultTypeChange = (value: string) => {
    setFaultTypeValue(value);
    
    const chatInParam = [
      ...extendedChatInParams,
      {
        param_type: 'fault_type',
        param_value: value,
        sub_type: '',
      },
    ];
    setChatInParams(chatInParam);
    setOpen(false);
  };

  const content = (
    <div className='w-64 p-2'>
      <div className='mb-2 text-sm font-medium'>选择故障类型</div>
      <Select
        value={faultTypeValue}
        onChange={handleFaultTypeChange}
        options={faultTypeOptions}
        placeholder="请选择故障类型"
        className='w-full'
        size='middle'
      />
    </div>
  );

  return (
    <Popover
      content={content}
      title={null}
      trigger='click'
      open={open}
      onOpenChange={setOpen}
      placement='topLeft'
      arrow={false}
    >
      <Tooltip title="故障类型" placement='bottom'>
        <div className='flex w-8 h-8 items-center justify-center rounded-md hover:bg-[rgb(221,221,221,0.6)] cursor-pointer'>
          <BugOutlined 
            className={`text-xl ${faultTypeValue ? 'text-[#0c75fc]' : ''}`}
          />
        </div>
      </Tooltip>
    </Popover>
  );
};

export default memo(FaultType);
