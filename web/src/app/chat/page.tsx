"use client"
import { apiInterceptors, getAppInfo, getChatHistory, getDialogueList } from '@/client/api';
import { ChartData, ChatHistoryResponse, IChatDialogueSchema, UserChatContent } from '@/types/chat';
import { IApp } from '@/types/app';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAsyncEffect, useDebounceFn, useRequest } from 'ahooks';
import useChat from '@/hooks/use-chat';
import ChatContentContainer from '@/components/chat/chat-content-container';
import { getInitMessage, STORAGE_INIT_MESSAGE_KET, transformFileMarkDown, transformFileUrl } from '@/utils';
import { Flex, Layout, Spin } from 'antd';
import { useSearchParams } from 'next/navigation';
import { ChatContentContext } from '@/contexts';
import HomeChat from '@/components/chat/content/home-chat';

const { Content } = Layout;

export default function Chat() {

  const searchParams = useSearchParams();
  const chatId = (searchParams?.get('conv_uid') || searchParams?.get('chatId')) ?? '';
  const app_code = searchParams?.get('app_code') ?? '';
  const modelName = searchParams?.get('model') ?? '';
  const knowledgeId = searchParams?.get('knowledge') ?? '';
  const scrollRef = useRef<HTMLDivElement>(null);
  const order = useRef<number>(1);
  const [history, setHistory] = useState<ChatHistoryResponse>([]);
  const [chartsData] = useState<Array<ChartData>>();
  const [replyLoading, setReplyLoading] = useState<boolean>(false);
  const [canAbort, setCanAbort] = useState<boolean>(false);
  const [agent, setAgent] = useState<string>('');
  const [appInfo, setAppInfo] = useState<IApp>({} as IApp);
  const [maxNewTokensValue, setMaxNewTokensValue] = useState<number | string>(4000);
  const [resourceValue, setResourceValue] = useState<any>();
  const [modelValue, setModelValue] = useState<string>('');
  const [isShowDetail, setIsShowDetail] = useState<boolean>(true);
  const [chatInParams, setChatInParams] = useState<{ param_type: string; param_value: string; sub_type?: string; }[]>([]);
  const [faultTypeValue, setFaultTypeValue] = useState<string>('');
  const [projectNameValue, setProjectNameValue] = useState<string>('');
  const chatInputRef = useRef<any>(null);
  const { chat, ctrl } = useChat({
    app_code: app_code || '',
  });
  
  useEffect(() => {
    if(appInfo?.layout?.chat_in_layout?.length){
      const layout =  appInfo?.layout?.chat_in_layout;
      const temp = layout.find((item: { param_type: string; }) => item.param_type === 'temperature');
      const token = layout.find((item: { param_type: string; }) => item.param_type === 'max_new_tokens');
      const resource = layout.find((item: { param_type: string; }) => item.param_type === 'resource');
      const model = layout.find((item: { param_type: string; }) => item.param_type === 'model');
      const faultType = layout.find((item: { param_type: string; }) => item.param_type === 'fault_type');
      const projectName = layout.find((item: { param_type: string; }) => item.param_type === 'project_name');
      
      // 根据渲染类型决定是字符串还是数字
      if (token?.param_render_type === 'string') {
        setMaxNewTokensValue(token?.param_default_value || '');
      } else {
        setMaxNewTokensValue(Number(token?.param_default_value) || 4000);
      }
      setModelValue(modelName || model?.param_default_value || '');
      setResourceValue(knowledgeId || resource?.param_default_value || null);
      setFaultTypeValue(faultType?.param_default_value || '');
      setProjectNameValue(projectName?.param_default_value || '');

      const chatInParam = [
          ...(temp ? [{
            param_type: 'temperature',
            param_value: typeof temp?.param_default_value === 'string'
              ? temp?.param_default_value
              : JSON.stringify(temp?.param_default_value),
            sub_type: temp?.sub_type,
          }] : []),
           ...(token ? [{
            param_type: 'max_new_tokens',
            param_value: typeof token?.param_default_value === 'string'
              ? token?.param_default_value
              : JSON.stringify(token?.param_default_value),
            sub_type: token?.sub_type,
          }] : []),
           ...(resource ? [{
            param_type: 'resource',
            param_value: typeof resource?.param_default_value === 'string'
              ? (knowledgeId || resource?.param_default_value)
              : JSON.stringify(knowledgeId || resource?.param_default_value),
            sub_type: resource?.sub_type,
          }] : []),
           ...(model ? [{
            param_type: 'model',
            param_value: typeof model?.param_default_value === 'string'
              ? (modelName || model?.param_default_value)
              : JSON.stringify(modelName || model?.param_default_value),
            sub_type: model?.sub_type,
          }] : []),
           ...(faultType ? [{
            param_type: 'fault_type',
            param_value: typeof faultType?.param_default_value === 'string'
              ? faultType?.param_default_value
              : JSON.stringify(faultType?.param_default_value),
            sub_type: faultType?.sub_type || '',
          }] : []),
           ...(projectName ? [{
            param_type: 'project_name',
            param_value: typeof projectName?.param_default_value === 'string'
              ? projectName?.param_default_value
              : JSON.stringify(projectName?.param_default_value),
            sub_type: projectName?.sub_type || '',
          }] : []),
        ]
        setChatInParams(chatInParam);
    }
  }, [appInfo?.layout?.chat_in_layout, modelName]);

  // 是否是默认小助手
  const isChatDefault = useMemo(() => {
    return !chatId;
  }, [chatId]);

  // 获取会话列表
  const {
    data: dialogueList = [],
    refresh: refreshDialogList,
    loading: listLoading,
  } = useRequest(async () => {
    return await apiInterceptors(getDialogueList());
  });

  // 获取应用详情
  const { run: queryAppInfo, refresh: refreshAppInfo, loading: appInfoLoading } = useRequest(
    async () =>
      await apiInterceptors(
        getAppInfo({
          app_code: app_code,
          building_mode: false
        }),
      ),
    {
      manual: true,
      onSuccess: data => {
        const [, res] = data;
        setAppInfo(res || ({} as IApp));
      },
    },
  );

  // 列表当前活跃对话
  const currentDialogue = useMemo(() => {
    const [, list] = dialogueList;
    return list?.find(item => item.conv_uid === chatId) || ({} as IChatDialogueSchema);
  }, [chatId, dialogueList]);

  useEffect(() => {
    // 如果有app_code或者不是默认聊天，则获取应用信息
    // 如果是默认聊天且没有app_code，使用默认的ai-coder应用
    if (app_code || !isChatDefault) {
      queryAppInfo();
    } else if (isChatDefault && !app_code) {
      // 默认使用ai-coder应用配置
      const defaultAppCode = 'ai-coder';
      apiInterceptors(
        getAppInfo({
          app_code: defaultAppCode,
          building_mode: false
        })
      ).then(data => {
        const [, res] = data;
        setAppInfo(res || ({} as IApp));
      });
    }
  }, [chatId, isChatDefault, queryAppInfo, app_code]);

  // 获取会话历史记录
  const {
    run: getHistory,
    loading: historyLoading,
    refresh: refreshHistory,
  } = useRequest(async () => await apiInterceptors(getChatHistory(chatId)), {
    manual: true,
    onSuccess: data => {
      const [, res] = data;
      const viewList = res?.filter(item => item.role === 'view');
      if (viewList && viewList.length > 0) {
        order.current = viewList[viewList.length - 1].order + 1;
      }
      setHistory(res || []);
    },
  });

  // 会话提问
  const handleChat = useCallback(
    (content: UserChatContent, data?: Record<string, unknown>) => {
      return new Promise<void>(resolve => {
        const initMessage = getInitMessage();
        const ctrl = new AbortController();
        setReplyLoading(true);
        if (history && history.length > 0) {
          const viewList = history?.filter(item => item.role === 'view');
          const humanList = history?.filter(item => item.role === 'human');
          order.current = (viewList[viewList.length - 1]?.order || humanList[humanList.length - 1]?.order) + 1;
        }
        let formattedDisplayContent: string = '';
          if (typeof content === 'string') {
          formattedDisplayContent = content;
        } else {
          // Extract content items for display formatting
          const contentItems = content.content || [];
          const textItems = contentItems.filter(item => item.type === 'text');
          const mediaItems = contentItems.filter(item => item.type !== 'text');
          // Format for display in the UI - extract text for main message
          if (textItems.length > 0) {
            // Use the text content for the main message display
            formattedDisplayContent = textItems.map(item => item.text).join(' ');
          }
          // Format media items for display (using markdown)
          const mediaMarkdown = mediaItems
            .map(item => {
              if (item.type === 'image_url') {
                const originalUrl = item.image_url?.url || '';
                // Transform the URL to a service URL that can be displayed
                const displayUrl = transformFileUrl(originalUrl);
                const fileName = item.image_url?.fileName || 'image';
                return `\n![${fileName}](${displayUrl})`;
              } else if (item.type === 'video') {
                const originalUrl = item.video || '';
                const displayUrl = transformFileUrl(originalUrl);
                return `\n[Video](${displayUrl})`;
              } else {
                const fileMarkdown = transformFileMarkDown(item.file_url);
                return `\n${fileMarkdown}`;
              }
            })
            .join('\n');

          // Combine text and media markup
          if (mediaMarkdown) {
            formattedDisplayContent = formattedDisplayContent + '\n' + mediaMarkdown;
          }
        }

        const tempHistory: ChatHistoryResponse = [
          ...(initMessage && initMessage.id === chatId ? [] : history),
          {
            role: 'human',
            context: formattedDisplayContent,
            model_name: (data as any)?.model_name || modelValue,
            order: order.current,
            time_stamp: 0,
          },
          {
            role: 'view',
            context: '',
            model_name: (data as any)?.model_name || modelValue,
            order: order.current,
            time_stamp: 0,
            thinking: true,
          },
        ];
        const index = tempHistory.length - 1;
        setHistory([...tempHistory]);
        chat({
          data: {
            user_input: content,
            team_mode: appInfo?.team_mode || '',
            app_config_code: appInfo?.config_code || '',
            conv_uid: chatId,
            ext_info: {
              vis_render: appInfo?.layout?.chat_layout?.name || '',
              incremental: appInfo?.layout?.chat_layout?.incremental || false,
            },
            ...data,
          },
          ctrl, 
          chatId,
          onMessage: message => {
            setCanAbort(true);
            if (message) {
              if (data?.incremental) {
                tempHistory[index].context += message;
                tempHistory[index].thinking = false;
              } else {
                tempHistory[index].context = message;
                tempHistory[index].thinking = false;
              }
              setHistory([...tempHistory]);
            }
          },
          onDone: () => {
            setReplyLoading(false);
            setCanAbort(false);
            resolve();
          },
          onClose: () => {
            setReplyLoading(false);
            setCanAbort(false);
            resolve();
          },
          onError: message => {
            setReplyLoading(false);
            setCanAbort(false);
            tempHistory[index].context = message;
            tempHistory[index].thinking = false;
            setHistory([...tempHistory]);
            resolve();
          },
        });
      });
    },
    [history, modelValue, chat, appInfo],
  );

  useAsyncEffect(async () => {
    // 如果是默认小助手，不获取历史记录
    if (isChatDefault) {
      return;
    }
    const initMessage = getInitMessage();
    if (initMessage && initMessage.id === chatId) {
      return;
    }
    if(chatId) {
      await getHistory();
    }
  }, [chatId, getHistory, app_code]);

  useEffect(() => {
    if (isChatDefault) {
      order.current = 1;
      setHistory([]);
    }
  }, [isChatDefault]);
  
  const debouncedChat = useDebounceFn(handleChat, { wait: 500 });
  // 初始化消息处理
  useAsyncEffect(async () => {
    const initMessage = getInitMessage();
    if (initMessage && initMessage.id === chatId && appInfo && chatInParams?.length > 0) {
        debouncedChat.run(initMessage.message, {
          app_code: appInfo?.app_code,
          ...(chatInParams?.length && {
            chat_in_params: chatInParams,
          }),
        });
        refreshDialogList && await refreshDialogList();
        localStorage.removeItem(STORAGE_INIT_MESSAGE_KET);
    }
  }, [chatId, getInitMessage(), appInfo, chatInParams]);

  const contentRender = () => {
      return isChatDefault ? (
        <Content>
          <HomeChat />
        </Content>
      ) : (
        <Spin spinning={appInfoLoading}  wrapperClassName='w-full h-screen'>
          <Content className='flex flex-col h-full'>
            <ChatContentContainer ref={scrollRef} ctrl={ctrl} />
          </Content>
        </Spin>
      );
  };

  return (
   <ChatContentContext.Provider
      value={{
        history,
        replyLoading,
        scrollRef,
        canAbort,
        chartsData: chartsData || [],
        agent,
        currentDialogue,
        appInfo,
        maxNewTokensValue,
        resourceValue,
        modelValue,
        setModelValue,
        setResourceValue,
        setMaxNewTokensValue,
        setAppInfo,
        setAgent,
        setCanAbort,
        setReplyLoading,
        handleChat,
        refreshDialogList,
        refreshHistory,
        refreshAppInfo,
        setHistory,
        isShowDetail,
        setChatInParams,
        chatInParams,
        faultTypeValue,
        setFaultTypeValue,
        projectNameValue,
        setProjectNameValue,
      }}
    >
      <Flex flex={1}>
        <Layout className='bg-gradient-light bg-cover bg-center dark:bg-gradient-dark w-full'>
          <Layout className='bg-transparent'>{contentRender()}</Layout>
        </Layout>
      </Flex>
    </ChatContentContext.Provider>
  )
}
