import { ChatContentContext } from "@/contexts";
import { ProjectOutlined } from '@ant-design/icons';
import { Popover, Select, Tooltip } from 'antd';
import React, { memo, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const ProjectName: React.FC<{
  projectNameValue: string;
  setProjectNameValue: (value: string) => void;
}> = ({ projectNameValue, setProjectNameValue }) => {
  const { appInfo, chatInParams, setChatInParams } = useContext(ChatContentContext);
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  // 所有Hooks必须在条件渲染之前调用
  const extendedChatInParams = useMemo(() => {
    return chatInParams?.filter(i => i.param_type !== 'project_name') || [];
  }, [chatInParams]);

  const project_name = useMemo(
    () => appInfo?.layout?.chat_in_layout?.find(i => i.param_type === 'project_name'),
    [appInfo?.layout?.chat_in_layout],
  );

  const paramKey: string[] = useMemo(() => {
    return appInfo?.layout?.chat_in_layout?.map(i => i.param_type) || [];
  }, [appInfo?.layout?.chat_in_layout]);

  const projectNameOptions = useMemo(() => {
    const options = project_name?.param_type_options || [];
    
    // 检查选项数据格式并转换
    if (options.length > 0 && typeof options[0] === 'string') {
      // 如果是字符串数组，转换为 {label, value} 格式
      return options.map((option: string) => ({
        label: option,
        value: option
      }));
    }
    
    if (options.length > 0 && options[0].label && options[0].value) {
      // 如果已经是正确格式，直接返回
      return options;
    }
    
    // 如果没有选项数据，提供默认选项
    if (options.length === 0) {
      return [
        { label: '重庆健康云ECS', value: '重庆健康云ECS' },
        { label: '长春政务云ECS', value: '长春政务云ECS' },
        { label: '新疆石河子ECS', value: '新疆石河子ECS' }
      ];
    }
    
    return options;
  }, [project_name?.param_type_options, appInfo]);

  if (!paramKey.includes('project_name')) {
    return (
      <Tooltip title="项目名称">
        <div className='flex w-8 h-8 items-center justify-center rounded-md hover:bg-[rgb(221,221,221,0.6)] cursor-pointer'>
          <ProjectOutlined className='text-xl cursor-not-allowed opacity-30' />
        </div>
      </Tooltip>
    );
  }

  const handleProjectNameChange = (value: string) => {
    setProjectNameValue(value);
    
    const chatInParam = [
      ...extendedChatInParams,
      {
        param_type: 'project_name',
        param_value: value,
        sub_type: '',
      },
    ];
    setChatInParams(chatInParam);
    setOpen(false);
  };

  const content = (
    <div className='w-64 p-2'>
      <div className='mb-2 text-sm font-medium'>选择项目名称</div>
      <Select
        value={projectNameValue}
        onChange={handleProjectNameChange}
        options={projectNameOptions}
        placeholder="请选择项目名称"
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
      <Tooltip title="项目名称" placement='bottom'>
        <div className='flex w-8 h-8 items-center justify-center rounded-md hover:bg-[rgb(221,221,221,0.6)] cursor-pointer'>
          <ProjectOutlined 
            className={`text-xl ${projectNameValue ? 'text-[#0c75fc]' : ''}`}
          />
        </div>
      </Tooltip>
    </Popover>
  );
};

export default memo(ProjectName);
