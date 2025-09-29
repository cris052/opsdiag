import { apiInterceptors, clearChatHistory, stopChat } from '@/client/api';
import { ChatContentContext } from "@/contexts";
import { ClearOutlined, CloseCircleOutlined, LoadingOutlined, PauseCircleOutlined, RedoOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { Spin, Tooltip } from 'antd';
import classNames from 'classnames';
import Image from 'next/image';
import React, { memo, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MaxNewTokens from './max-new-tokens';
import ModelSwitcher from './model-switcher';
import Resource from './resource';
import FaultType from './fault-type';
import ProjectName from './project-name';
import { parseResourceValue, transformFileUrl } from '@/utils';
import { useSearchParams } from 'next/navigation';

interface ToolsConfig {
  icon: React.ReactNode;
  can_use: boolean;
  key: string;
  tip?: string;
  onClick?: () => void;
}

const ToolsBar: React.FC<{
  ctrl: AbortController;
}> = ({ ctrl }) => {
  const { t } = useTranslation();

  const {
    history,
    scrollRef,
    canAbort,
    replyLoading,
    currentDialogue,
    appInfo,
    maxNewTokensValue,
    resourceValue,
    faultTypeValue,
    projectNameValue,
    setMaxNewTokensValue,
    setFaultTypeValue,
    setProjectNameValue,
    refreshHistory,
    setCanAbort,
    setReplyLoading,
    handleChat,
    chatInParams,
    setChatInParams,
    setResourceValue
  } = useContext(ChatContentContext);

  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [clsLoading, setClsLoading] = useState<boolean>(false);
  const searchParams = useSearchParams();
  const chatId = searchParams?.get('conv_uid') ?? '';


  // 左边工具栏动态可用key
   const paramKey: string[] = useMemo(() => {
    return appInfo?.layout?.chat_in_layout?.map(i => i.param_type) || [];
  }, [appInfo?.layout?.chat_in_layout]);

  const rightToolsConfig: ToolsConfig[] = useMemo(() => {
    return [
      {
        tip: t('stop_replying'),
        icon: <PauseCircleOutlined className={classNames({ 'text-[#0c75fc]': canAbort })} />,
        can_use: canAbort,
        key: 'abort',
        onClick: () => {
          if (!canAbort) {
            return;
          }
          stopChat({ conv_session_id: chatId });
          ctrl && ctrl.abort();
          setTimeout(() => {
            setCanAbort(false);
            setReplyLoading(false);
          }, 100);
        },
      },
      {
        tip: t('answer_again'),
        icon: <RedoOutlined />,
        can_use: !replyLoading && history.length > 0,
        key: 'redo',
        onClick: async () => {
          const lastHuman = history.filter(i => i.role === 'human')?.slice(-1)?.[0];
          handleChat(lastHuman?.context || '', {
            app_code: appInfo.app_code,
            ...(paramKey.length && {
              chat_in_params: chatInParams,
            }),
          });
          setTimeout(() => {
            scrollRef.current?.scrollTo({
              top: scrollRef.current?.scrollHeight,
              behavior: 'smooth',
            });
          }, 0);
        },
      },
      {
        tip: t('erase_memory'),
        icon: clsLoading ? (
          <Spin spinning={clsLoading} indicator={<LoadingOutlined style={{ fontSize: 20 }} />} />
        ) : (
          <ClearOutlined />
        ),
        can_use: history.length > 0,
        key: 'clear',
        onClick: async () => {
          if (clsLoading) {
            return;
          }
          setClsLoading(true);
          await apiInterceptors(clearChatHistory(chatId)).finally(async () => {
            await refreshHistory();
            setClsLoading(false);
          });
        },
      },
    ];
  }, [
    t,
    canAbort,
    replyLoading,
    history,
    clsLoading,
    ctrl,
    setCanAbort,
    setReplyLoading,
    handleChat,
    appInfo.app_code,
    paramKey,
    resourceValue,
    currentDialogue?.select_param,
    currentDialogue?.conv_uid,
    scrollRef,
    refreshHistory,
  ]);

  const returnTools = (config: ToolsConfig[]) => {
    return (
      <>
        {config.map(item => (
          <Tooltip key={item.key} title={item.tip} arrow={false} placement='bottom'>
            <div
              className={`flex w-8 h-8 items-center justify-center rounded-md hover:bg-[rgb(221,221,221,0.6)] text-lg ${
                item.can_use ? 'cursor-pointer' : 'opacity-30 cursor-not-allowed'
              }`}
              onClick={() => {
                item.onClick?.();
              }}
            >
              {item.icon}
            </div>
          </Tooltip>
        ))}
      </>
    );
  };

  const fileName = useMemo(() => {
    try {
      // First try to get file_name from resourceValue
      if (resourceValue) {
        if (typeof resourceValue === 'string') {
          return JSON.parse(resourceValue).file_name || '';
        } else {
          return resourceValue.file_name || '';
        }
      }
    } catch {
      return '';
    }
  }, [resourceValue]);

  const ResourceItemsDisplay = () => {
    // 检查是否有上传的文件
    const hasUploadedFile = resourceValue && typeof resourceValue === 'object' && 'file_name' in resourceValue;
    if (!hasUploadedFile) return null;

    const fileName = (resourceValue as any).file_name;
    
    const handleDelete = () => {
      setResourceValue({});
      const extendedChatInParams = chatInParams?.filter(i => i.param_type !== 'resource') || [];
      const resource = appInfo?.layout?.chat_in_layout?.find(i => i.param_type === 'resource');
      
      const chatInParam = [
        ...extendedChatInParams,
        {
          param_type: 'resource',
          param_value: '',
          sub_type: resource?.sub_type,
        },
      ];
      setChatInParams(chatInParam);
    };

    return (
      <div className='flex flex-wrap gap-2 mt-2'>
        <div className='relative flex items-center justify-between border border-[#e3e4e6] dark:border-[rgba(255,255,255,0.6)] rounded-md py-1 px-2 bg-[#f3f6ff] min-w-[120px] max-w-[180px]'>
          {/* Delete icon */}
          <span
            className='absolute top-[-2px] right-[1] cursor-pointer z-10 text-gray-500 hover:text-red-500'
            onClick={handleDelete}
            title='删除文件'
          >
            <CloseCircleOutlined />
          </span>
          <div className='flex items-center'>
            <span className='mr-1 text-sm'>📄</span>
            <span className='text-xs text-[#2b6cff] line-clamp-1 truncate'>{fileName}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className='flex flex-col  mb-2'>
      <div className='flex items-center justify-between h-full w-full'>
        <div className='flex gap-3 text-lg'>
          <ModelSwitcher />
          {/* 文件 */}
          <Resource fileList={fileList} setFileList={setFileList} setLoading={setLoading} fileName={fileName} />
          <MaxNewTokens maxNewTokensValue={maxNewTokensValue} setMaxNewTokensValue={setMaxNewTokensValue} />
          <FaultType faultTypeValue={faultTypeValue} setFaultTypeValue={setFaultTypeValue} />
          <ProjectName projectNameValue={projectNameValue} setProjectNameValue={setProjectNameValue} />
        </div>
        <div className='flex gap-1'>{returnTools(rightToolsConfig)}</div>
      </div>
      <ResourceItemsDisplay />
      <Spin spinning={loading} indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
    </div>
  );
};

export default memo(ToolsBar);
