import { ChatContentContext } from "@/contexts";
import { ControlOutlined } from '@ant-design/icons';
import { Input, InputNumber, Popover, Slider, Tooltip } from 'antd';
import React, { memo, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const MaxNewTokens: React.FC<{
  maxNewTokensValue: number | string;
  setMaxNewTokensValue: (value: number | string) => void;
}> = ({ maxNewTokensValue, setMaxNewTokensValue }) => {
  const { appInfo, chatInParams, setChatInParams } = useContext(ChatContentContext);
  const { t } = useTranslation();

  // 所有Hooks必须在条件渲染之前调用
  const extendedChatInParams = useMemo(() => {
    return chatInParams?.filter(i => i.param_type !== 'max_new_tokens') || [];
  }, [chatInParams]);

  const max_new_tokens = useMemo(
    () => appInfo?.layout?.chat_in_layout?.find(i => i.param_type === 'max_new_tokens'),
    [appInfo?.layout?.chat_in_layout],
  );

  const paramKey: string[] = useMemo(() => {
    return appInfo?.layout?.chat_in_layout?.map(i => i.param_type) || [];
  }, [appInfo?.layout?.chat_in_layout]);

  // 判断是否为IP设置（STRING类型）
  const isIpSetting = useMemo(() => {
    return max_new_tokens?.param_render_type === 'string';
  }, [max_new_tokens?.param_render_type]);

  if (!paramKey.includes('max_new_tokens')) {
    return (
      <Tooltip title={t('max_new_tokens_tip')}>
        <div className='flex w-8 h-8 items-center justify-center rounded-md hover:bg-[rgb(221,221,221,0.6)] cursor-pointer'>
          <ControlOutlined className='text-xl cursor-not-allowed opacity-30' />
        </div>
      </Tooltip>
    );
  }

  // 处理文字输入的值变化（IP设置）
  const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const chatInParam = [
      ...extendedChatInParams,
      {
        param_type: 'max_new_tokens',
        param_value: value,
        sub_type: max_new_tokens?.sub_type,
      },
    ];
    setChatInParams(chatInParam);
    setMaxNewTokensValue(value);
  };

  // 处理 InputNumber 的值变化（数字设置）
  const handleInputChange = (value: number | null) => {
    if (value === null || isNaN(value)) {
      return;
    }
    const chatInParam = [
      ...extendedChatInParams,
      {
        param_type: 'max_new_tokens',
        param_value: JSON.stringify(value),
        sub_type: max_new_tokens?.sub_type,
      },
    ];
    setChatInParams(chatInParam);
    setMaxNewTokensValue(value);
  };

  // 处理 Slider 的值变化（数字设置）
  const handleSliderChange = (value: number) => {
    if (isNaN(value)) {
      return;
    }
    const chatInParam = [
      ...extendedChatInParams,
      {   
        param_type: 'max_new_tokens',
        param_value: JSON.stringify(value),
        sub_type: max_new_tokens?.sub_type,
      },
    ];
    setChatInParams(chatInParam);
    setMaxNewTokensValue(value);
  };

  return (
    <div className='flex items-center'>
      <Popover
        arrow={false}
        trigger={['click']}
        placement='topLeft'
        content={() => (
          <div className='flex items-center gap-2'>
            {isIpSetting ? (
              // IP设置：文字输入框
              <Input
                size='small'
                className='w-40'
                placeholder='请输入内容'
                onChange={handleTextInputChange}
                value={typeof maxNewTokensValue === 'string' ? maxNewTokensValue : ''}
              />
            ) : (
              // Token设置：数字输入框和滑块
              <>
                <Slider
                  className='w-32'
                  min={1}
                  max={20480}
                  step={1}
                  onChange={handleSliderChange}
                  value={typeof maxNewTokensValue === 'number' ? maxNewTokensValue : 4000}
                />
                <InputNumber
                  size='small'
                  className='w-20'
                  min={1}
                  max={20480}
                  step={1}
                  onChange={handleInputChange}
                  value={typeof maxNewTokensValue === 'number' ? maxNewTokensValue : 4000}
                />
              </>
            )}
          </div>
        )}
      >
        <Tooltip title={isIpSetting ? 'IP设置' : t('max_new_tokens')} placement='bottom' arrow={false}>
          <div className='flex w-8 h-8 items-center justify-center rounded-md hover:bg-[rgb(221,221,221,0.6)] cursor-pointer'>
            <ControlOutlined />
          </div>
        </Tooltip>
      </Popover>
      <span className='text-sm ml-2'>{maxNewTokensValue}</span>
    </div>
  );
};

export default memo(MaxNewTokens);
