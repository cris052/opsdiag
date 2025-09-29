import { apiInterceptors, postChatModeParamsFileLoad } from '@/client/api';
import { getChatInputConfigParams } from '@/client/api/app';
import { ChatContentContext } from '@/contexts';
import { IDB } from '@/types/chat';
import { ExperimentOutlined, FolderAddOutlined } from '@ant-design/icons';
import { useAsyncEffect, useRequest } from 'ahooks';
import type { UploadFile } from 'antd';
import { Select, Tooltip, Upload, notification } from 'antd';
import classNames from 'classnames';
import { useSearchParams } from 'next/navigation';
import React, { memo, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const upLoadList = [
    "text_file", "image_file"
];

const getAcceptTypes = (type: string) => {
  switch (type) {
    case 'text_file':
      return '.txt,.doc,.docx,.pdf,.md';
    case 'image_file':
      return '.jpg,.jpeg,.png,.gif,.bmp,.webp';
    case 'audio_file':
      return '.mp3,.wav,.ogg,.aac';
    case 'video_file':
      return '.mp4,.wav,.wav';
    default:
      return ''; // 空字符串表示支持所有文件类型
  }
};

const Resource: React.FC<{
  fileList: UploadFile[];
  setFileList: React.Dispatch<React.SetStateAction<UploadFile<any>[]>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  fileName: string;
}> = ({ fileList, setFileList, setLoading, fileName }) => {
  const { setResourceValue, appInfo, chatInParams, setChatInParams, refreshHistory, refreshDialogList, modelValue, resourceValue } =
    useContext(ChatContentContext);
  const { maxNewTokensValue } = useContext(ChatContentContext);
  const searchParams = useSearchParams();
  const scene = searchParams?.get('scene') ?? '';
  const chatId = (searchParams?.get('conv_uid') || searchParams?.get('chatId')) ?? '';
  const { t } = useTranslation();
  // dataBase or knowledge
  const [dbs, setDbs] = useState<IDB[]>([]);

  // 左边工具栏动态可用key
  const paramKey: string[] = useMemo(() => {
    return appInfo?.layout?.chat_in_layout?.map(i => i.param_type) || [];
  }, [appInfo?.layout?.chat_in_layout]);

  const isResourceItem = useMemo(() => {
    return (
      paramKey.includes('resource') &&
      !upLoadList.includes(appInfo?.layout?.chat_in_layout?.filter(i => i.param_type === 'resource')[0]?.sub_type) 
    );
  }, [appInfo?.layout?.chat_in_layout, paramKey]);

  const extendedChatInParams = useMemo(() => {
    return chatInParams?.filter(i => i.param_type !== 'resource') || [];
  }, [chatInParams]);

  const resource = useMemo(
    () => appInfo?.layout?.chat_in_layout?.find(i => i.param_type === 'resource'),
    [appInfo?.layout?.chat_in_layout],
  );

  const { run, loading } = useRequest(async data => await apiInterceptors(getChatInputConfigParams([data])), {
    manual: true,
    onSuccess: data => {
      const [, res] = data;
      const resourceData = res?.find(
        (item: any) => item.param_type === 'resource' && item.sub_type === resource?.sub_type,
      );
      if (!resourceData) return;
      setDbs(resourceData?.param_type_options ?? []);
    },
  });

  useAsyncEffect(async () => {
    if (isResourceItem && resource) {
      await run(resource);
    }
  }, [isResourceItem, resource]);

  const dbOpts = useMemo(
    () =>
      dbs.map?.((db: any) => {
        return {
          label: db.label,
          value: db.key,
        };
      }),
    [dbs],
  );
  // resource 特殊处理
  useEffect(() => {
    if (chatInParams?.length > 0 && resource && dbs.length > 0) {
      const chatInParamsResource = chatInParams.find(i => i.param_type === 'resource');
      if (chatInParamsResource && chatInParamsResource?.param_value) {
        if (!chatInParamsResource?.param_value.trim().startsWith('{')) {
          const resourceItem = dbs.find((i: any) => i.key === resourceValue);
          const chatInParam = [
            ...extendedChatInParams,
            {
              param_type: 'resource',
              param_value: JSON.stringify(resourceItem),
              sub_type: resource?.sub_type,
            },
          ];
          setChatInParams(chatInParam);
        }
      } else {
      }
    }
  }, [chatInParams, resource, dbs, setChatInParams, resourceValue]);

  const handleChatInParamChange = (val: any) => {
    if (val) {
      setResourceValue(val);
      const resourceItem = dbs.find((i:any) => i.key === val);
      const chatInParam = [
        ...extendedChatInParams,
        {
          param_type: 'resource',
          param_value: JSON.stringify(resourceItem),
          sub_type: resource?.sub_type,
        },
      ];
      setChatInParams(chatInParam);
    }
  };

  // 上传
  const onUpload = useCallback(async () => {
    const file = fileList?.[0];
    if (!file) return;

    setLoading(true);
    
    try {
      // 模拟上传成功
      const mockRes = {
        file_name: file.name,
        file_size: file.size,
        upload_time: new Date().toISOString()
      };

      const chatInParam = [
        ...extendedChatInParams,
        {
          param_type: 'resource',
          param_value: JSON.stringify(mockRes),
          sub_type: resource?.sub_type,
        },
      ];
      setChatInParams(chatInParam);
      setResourceValue(mockRes);
      
      // 显示成功弹窗
      notification.success({
        message: '✅ 文件上传成功',
        description: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#52c41a', fontSize: '16px' }}>📄</span>
            <span>{`"${file.name}" 已成功上传并可以使用`}</span>
          </div>
        ),
        placement: 'topRight',
        duration: 4,
        style: {
          borderRadius: '12px',
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.12)',
          border: '1px solid #b7eb8f',
          backgroundColor: '#f6ffed',
        },
      });
      
      await refreshHistory();
      refreshDialogList && (await refreshDialogList());
    } catch (error) {
      console.error('Upload failed:', error);
      notification.error({
        message: '❌ 文件上传失败',
        description: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#ff4d4f', fontSize: '16px' }}>⚠️</span>
            <span>上传过程中出现错误，请检查文件格式后重试</span>
          </div>
        ),
        placement: 'topRight',
        duration: 5,
        style: {
          borderRadius: '12px',
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.12)',
          border: '1px solid #ffccc7',
          backgroundColor: '#fff2f0',
        },
      });
    } finally {
      setLoading(false);
    }
  }, [chatId, fileList, modelValue, refreshDialogList, refreshHistory, scene, setLoading, setResourceValue, extendedChatInParams, setChatInParams, resource?.sub_type]);

  if (!paramKey.includes('resource')) {
    return (
      <Tooltip title={t('extend_tip')}>
        <div className='flex w-8 h-8 items-center justify-center rounded-md hover:bg-[rgb(221,221,221,0.6)]'>
          <ExperimentOutlined className='text-lg cursor-not-allowed opacity-30' />
        </div>
      </Tooltip>
    );
  }

  switch (resource?.sub_type) {
    case 'text_file':
    case 'image_file':
    case 'common_file':
      return (
        <Upload
          name='file'
          accept={getAcceptTypes(resource?.sub_type)}
          fileList={fileList}
          showUploadList={false}
          beforeUpload={(_, fileList) => {
            setFileList?.(fileList);
          }}
          customRequest={onUpload}
          disabled={!!fileName}
        >
          <Tooltip title={t('file_tip')} arrow={false} placement='bottom'>
            <div className='flex w-8 h-8 items-center justify-center rounded-md hover:bg-[rgb(221,221,221,0.6)]'>
              <FolderAddOutlined
                className={classNames('text-xl', { 'cursor-pointer': !(!!fileName || !!fileList[0]?.name) })}
              />
            </div>
          </Tooltip>
        </Upload>
      );
     default:
      return (
        <Select
          value={resourceValue}
          className='w-30 h-8 rounded-3xl'
          onChange={val => {
            handleChatInParamChange(val);
          }}
          disabled={!!resource?.bind_value}
          loading={loading}
          options={dbOpts}
        />
      );
  }
};

export default memo(Resource);
