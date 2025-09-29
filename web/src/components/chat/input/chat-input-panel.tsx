import { ChatContentContext } from "@/contexts";
import { LoadingOutlined } from '@ant-design/icons';
import { Button, Input, Spin } from 'antd';
import classNames from 'classnames';
import { useSearchParams } from 'next/navigation';
import React, { memo, useContext, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ToolsBar from './tools-bar';
import { UserChatContent } from '@/types/chat';
import { parseResourceValue } from '@/utils';
import { MEDIA_RESOURCE_TYPES } from "@/app/application/structure/components/base-config/chat-layout-config";

const ChatInputPanel: React.FC<{ ctrl: AbortController; onSend?: (message: string) => void }> = ({ ctrl, onSend }) => {
  const { t } = useTranslation();
  const context = useContext(ChatContentContext);
  
  // 如果没有提供Context，使用默认值
  const {
    scrollRef = null,
    replyLoading = false,
    handleChat = null,
    appInfo = null,
    resourceValue = null,
    refreshDialogList = null,
    chatInParams = [],
    setResourceValue = () => {}
  } = context || {};

  const [userInput, setUserInput] = useState<string>('');
  const [isFocus, setIsFocus] = useState<boolean>(false);
  const [isZhInput, setIsZhInput] = useState<boolean>(false);

  const submitCountRef = useRef(0);

   const paramKey: string[] = useMemo(() => {
    return appInfo?.layout?.chat_in_layout?.map(i => i.param_type) || [];
  }, [appInfo?.layout?.chat_in_layout]);

  const onSubmit = async () => {
    submitCountRef.current++;
    
    // 如果提供了onSend回调，直接使用它
    if (onSend) {
      onSend(userInput);
      setUserInput('');
      return;
    }
    
    // 否则使用Context中的handleChat
    setTimeout(() => {
      scrollRef?.current?.scrollTo({
        top: scrollRef.current?.scrollHeight,
        behavior: 'smooth',
      });
      setUserInput('');
    }, 0);

    // Clear the resourceValue if it not empty
    let newUserInput: UserChatContent;
    if (
      MEDIA_RESOURCE_TYPES.includes(
        chatInParams.find((i: any) => i.param_type === 'resource')?.sub_type ?? ''
      )
    ) {
      setResourceValue(resourceValue || {});
      const resources = parseResourceValue(resourceValue);
      const messages = [...resources];
      messages.push({
        type: 'text',
        text: userInput,
      });
      newUserInput = {
        role: 'user',
        content: messages,
      };
    } else {
      newUserInput = userInput;
    }
    
    if (handleChat) {
      await handleChat(newUserInput, {
        app_code: appInfo?.app_code || '',
        ...(paramKey.length && {
          chat_in_params: chatInParams,
        }),
      });
    }
    
    // 如果应用进来第一次对话，刷新对话列表
    if (submitCountRef.current === 1) {
      refreshDialogList && await refreshDialogList();
    }
  };

  return (
    <div className='flex flex-col w-full mx-auto pt-4 pb-0 bg-transparent'>
      <div
        className={`flex flex-1 flex-col bg-white dark:bg-[rgba(255,255,255,0.16)] px-5 py-4 pt-2 rounded-xl relative border border-[#E0E7F2] dark:border-[rgba(255,255,255,0.6)] ${
          isFocus ? 'border-[#0c75fc]' : ''
        }`}
        id='input-panel'
      >
        <ToolsBar ctrl={ctrl} />
        <Input.TextArea
          placeholder={t('input_tips')}
          className='w-full h-10 resize-none border-0 p-0 focus:shadow-none dark:bg-transparent'
          value={userInput}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              if (e.shiftKey) {
                return;
              }
              if (isZhInput) {
                return;
              }
              e.preventDefault();
              if (!userInput.trim() || replyLoading) {
                return;
              }
              onSubmit();
            }
          }}
          onChange={e => {
            setUserInput(e.target.value);
          }}
          onFocus={() => {
            setIsFocus(true);
          }}
          onBlur={() => setIsFocus(false)}
          onCompositionStart={() => setIsZhInput(true)}
          onCompositionEnd={() => setIsZhInput(false)}
        />
        <Button
          type='primary'
          className={classNames(
            'flex items-center justify-center w-14 h-8 rounded-lg text-sm absolute right-4 bottom-3 bg-button-gradient border-0',
            {
              'cursor-not-allowed': !userInput.trim(),
            },
          )}
          onClick={() => {
            if (replyLoading || !userInput.trim()) {
              return;
            }
            onSubmit();
          }}
        >
          {replyLoading ? (
            <Spin spinning={replyLoading} indicator={<LoadingOutlined className='text-white' />} />
          ) : (
            t('sent')
          )}
        </Button>
      </div>
    </div>
  );
};

export default memo(ChatInputPanel);
