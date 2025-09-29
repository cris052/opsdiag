'use client'
import { ChatContext } from '@/contexts';
import {
  addPrompt,
  apiInterceptors,
  llmOutVerify,
  promptTemplateLoad,
  promptTypeTarget,
  updatePrompt,
} from '@/client/api';
import ModelIcon from '@/components/icons/model-icon';
import { DebugParams, OperatePromptParams } from '@/types/prompt';
import { getUserId } from '@/utils';
import { HEADER_USER_ID_KEY } from '@/utils/constants/index';
import { LeftOutlined } from '@ant-design/icons';
import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source';
import JsonView from '@uiw/react-json-view';
import { githubDarkTheme } from '@uiw/react-json-view/githubDark';
import { githubLightTheme } from '@uiw/react-json-view/githubLight';
import { useRequest } from 'ahooks';
import { Alert, App, Button, Card, Form, Input, InputNumber, Select, Slider, Space } from 'antd';
import classNames from 'classnames';
import MarkdownIt from 'markdown-it';
import dynamic from 'next/dynamic';
import { useRouter, useParams } from 'next/navigation';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import 'react-markdown-editor-lite/lib/index.css';

const MarkdownEditor = dynamic(() => import('react-markdown-editor-lite'), {
  ssr: false,
});
const mdParser = new MarkdownIt();

const MarkdownContext = dynamic(() => import('@/components/chat/chat-content-components/markdown-context'), { ssr: false });

const TypeOptions = [
  {
    value: 'Agent',
    label: 'AGENT',
  },
  {
    value: 'Scene',
    label: 'SCENE',
  },
  {
    value: 'Normal',
    label: 'NORMAL',
  },
  {
    value: 'Evaluate',
    label: 'EVALUATE',
  },
];

interface BottomFormProps {
  model: string;
  prompt_language: 'en' | 'zh';
}

interface TopFormProps {
  prompt_type: string;
  prompt_name: string;
  target: string;
  prompt_code: string;
}


const AddOrEditPrompt: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const type = params?.type as string || '';
  const { t } = useTranslation();

  const { modelList, model, mode } = useContext(ChatContext);
  const theme = mode === 'dark' ? githubDarkTheme : githubLightTheme;

  const { message } = App.useApp();

  // const userInfo = useUser();

  // prompt内容
  const [value, setValue] = useState<string>('');
  // 输入参数
  const [variables, setVariables] = useState<string[]>([]);
  // 输出结构
  const [responseTemplate, setResponseTemplate] = useState<any>({});
  // LLM输出
  const [history, setHistory] = useState<Record<string, any>[]>([]);
  const [llmLoading, setLlmLoading] = useState<boolean>(false);

  // prompt基本信息
  const [topForm] = Form.useForm<TopFormProps>();
  // 输入参数
  const [midForm] = Form.useForm();
  // 模型，温度，语言
  const [bottomForm] = Form.useForm<BottomFormProps>();
  // 验证错误信息
  const [errorMessage, setErrorMessage] = useState<Record<string, any>>();

  const promptType = Form.useWatch('prompt_type', topForm);

  const modelOptions = useMemo(() => {
    return modelList.map(item => {
      return {
        value: item,
        label: (
          <div className='flex items-center'>
            <ModelIcon model={item} />
            <span className='ml-2'>{item}</span>
          </div>
        ),
      };
    });
  }, [modelList]);

  // md编辑器变化
  const onChange = useCallback((props: any) => {
    setValue(props.text);
  }, []);

  // 获取target选项
  const {
    data,
    run: getTargets,
    loading,
  } = useRequest(async (type: string) => await promptTypeTarget(type), {
    manual: true,
  });

  // 获取template
  const { run: getTemplate } = useRequest(
    async (target: string) =>
      await promptTemplateLoad({
        prompt_type: promptType,
        target: target ?? '',
        sub_target: '', // or provide a suitable value if available
      }),
    {
      manual: true,
      onSuccess: res => {
        if (res) {
          const { data } = res.data;
          setValue(data.template);
          setVariables(data.input_variables);
          try {
            const jsonTemplate = JSON.parse(data.response_format);
            setResponseTemplate(jsonTemplate || {});
          } catch {
            setResponseTemplate({});
          }
        }
      },
    },
  );

  // add or edit prompt
  const { run: operatePrompt, loading: operateLoading } = useRequest(
    async (params: OperatePromptParams) => {
      if (type === 'add') {
        return await apiInterceptors(addPrompt(params));
      } else {
        return await apiInterceptors(updatePrompt(params));
      }
    },
    {
      manual: true,
      onSuccess: () => {
        message.success(`${type === 'add' ? t('Add') : t('update')}${t('success')}`);
        router.replace('/prompt');
      },
    },
  );

  const operateFn = () => {
    topForm.validateFields().then(async values => {
      const params: OperatePromptParams = {
        sub_chat_scene: '',
        model: bottomForm.getFieldValue('model'),
        chat_scene: values.target,
        prompt_name: values.prompt_name,
        prompt_type: values.prompt_type,
        content: value,
        response_schema: JSON.stringify(responseTemplate),
        input_variables: JSON.stringify(variables),
        prompt_language: bottomForm.getFieldValue('prompt_language'),
        prompt_desc: '',
        user_name: '',
        ...(type === 'edit' && { prompt_code: values.prompt_code }),
      };
      await operatePrompt(params);
    });
  };

  // llm测试
  const onLLMTest = async () => {
    if (llmLoading) {
      return;
    }
    // 校验后续是否服务端下发
    const midVals = midForm.getFieldsValue();
    // if (!Object.values(midVals).every(value => !!value)) {
    //   message.warning(t('Please_complete_the_input_parameters'));
    //   return;
    // }
    // @ts-ignore
    if (!bottomForm.getFieldValue('user_input')) {
      message.warning(t('Please_fill_in_the_user_input'));
      return;
    }
    topForm.validateFields().then(async values => {
      const params: DebugParams = {
        sub_chat_scene: '',
        model: bottomForm.getFieldValue('model'),
        chat_scene: values.target,
        prompt_name: values.prompt_name,
        prompt_type: values.prompt_type,
        content: value,
        response_schema: JSON.stringify(responseTemplate),
        input_variables: JSON.stringify(variables),
        prompt_language: bottomForm.getFieldValue('prompt_language'),
        prompt_desc: '',
        prompt_code: values.prompt_code,
        debug_model: bottomForm.getFieldValue('model'),
        input_values: {
          ...midVals,
        },
        // @ts-ignore
        user_input: bottomForm.getFieldValue('user_input'),
      };
      const tempHistory: Record<string, any>[] = [{ role: 'view', context: '' }];
      const index = tempHistory.length - 1;
      try {
        setLlmLoading(true);
        await fetchEventSource(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/prompt/template/debug`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [HEADER_USER_ID_KEY]: getUserId() ?? '',
          },
          body: JSON.stringify(params),
          openWhenHidden: true,
          async onopen(response) {
            if (response.ok && response.headers.get('content-type') === EventStreamContentType) {
              return;
            }
          },
          onclose() {
            setLlmLoading(false);
          },
          onerror(err) {
            throw new Error(err);
          },
          onmessage: event => {
            let message = event.data;
            if (!message) return;
            try {
              message = JSON.parse(message).vis;
            } catch {
              message.replaceAll('\\n', '\n');
            }
            if (message === '[DONE]') {
              setLlmLoading(false);
            } else if (message?.startsWith('[ERROR]')) {
              setLlmLoading(false);
              tempHistory[index].context = message?.replace('[ERROR]', '');
            } else {
              tempHistory[index].context = message;
              setHistory([...tempHistory]);
            }
          },
        });
      } catch {
        setLlmLoading(false);
        tempHistory[index].context = 'Sorry, we meet some error, please try again later';
        setHistory([...tempHistory]);
      }
    });
  };

  // 输出验证
  const { run, loading: verifyLoading } = useRequest(
    async () =>
      await llmOutVerify({
        llm_out: history[0].context,
        prompt_type: topForm.getFieldValue('prompt_type'),
        chat_scene: topForm.getFieldValue('target'),
      }),
    {
      manual: true,
      onSuccess: res => {
        if (res?.data?.success) {
          setErrorMessage({ msg: '验证通过', status: 'success' });
        } else {
          setErrorMessage({ msg: res?.data?.err_msg, status: 'error' });
        }
      },
    },
  );

  // 设置默认模型
  useEffect(() => {
    if (model) {
      bottomForm.setFieldsValue({
        model,
      });
    }
  }, [bottomForm, model]);

  // 类型改变获取相应的场景
  useEffect(() => {
    if (promptType) {
      getTargets(promptType);
    }
  }, [getTargets, promptType]);

  const targetOptions = useMemo(() => {
    return data?.data?.data?.map((option: any) => {
      return {
        ...option,
        value: option.name,
        label: option.name,
      };
    });
  }, [data]);

  // 编辑进入填充内容
  useEffect(() => {
    if (type === 'edit') {
      const editData = JSON.parse(localStorage.getItem('edit_prompt_data') || '{}');
      setVariables(JSON.parse(editData.input_variables ?? '[]'));
      setValue(editData?.content);
      topForm.setFieldsValue({
        prompt_type: editData.prompt_type,
        prompt_name: editData.prompt_name,
        prompt_code: editData.prompt_code,
        target: editData.chat_scene,
      });
      bottomForm.setFieldsValue({
        model: editData.model,
        prompt_language: editData.prompt_language,
      });
    }
  }, [bottomForm, topForm, type]);

  return (
    <div
      className={`flex flex-col w-full h-full justify-between dark:bg-gradient-dark }`}
    >
      <header className='flex items-center justify-between px-6 py-2 h-14 border-b border-[#edeeef]'>
        <Space className='flex items-center'>
          <LeftOutlined
            className='text-base cursor-pointer hover:text-[#0c75fc]'
            onClick={() => {
              localStorage.removeItem('edit_prompt_data');
              router.replace('/prompt');
            }}
          />
          <span className='font-medium text-sm'>{type === 'add' ? t('Add') : t('Edit')} Prompt</span>
        </Space>
        <Space>
          <Button type='primary' onClick={operateFn} loading={operateLoading}>
            {type === 'add' ? t('save') : t('update')}
          </Button>
        </Space>
      </header>
      <section className='flex h-full p-4 gap-4'>
        {/* 编辑展示区 */}
        <div className='flex flex-col flex-1 h-full overflow-y-auto pb-8'>
          {history.length > 0 ? (
            <div className='flex flex-col h-full'>
              <div className='flex-1 min-h-0 h-full'>
                <MarkdownEditor
                  value={value}
                  onChange={onChange}
                  renderHTML={text => mdParser.render(text)}
                  view={{ html: false, md: true, menu: true }}
                />
              </div>
              <div className='flex-1 min-h-0 mt-2'>
                <Card
                  title={
                  <Space>
                    <span>LLM OUT</span>
                    {errorMessage && <Alert message={errorMessage.msg} type={errorMessage.status} showIcon />}
                  </Space>
                  }
                  className='h-full overflow-hidden flex flex-col'
                  styles={{ body: { height: '100%', overflowY: 'auto' } }}
                >
                  <div>
                    <MarkdownContext>{history?.[0]?.context.replace(/\\n/gm, '\n')}</MarkdownContext>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <div className='h-full'>
              <MarkdownEditor
                value={value}
                onChange={onChange}
                renderHTML={text => mdParser.render(text)}
                view={{ html: false, md: true, menu: true }}
              />
            </div>
          )}
        </div>
        {/* 功能区 */}
        <div className='flex flex-col w-2/5 pb-8 overflow-y-auto'>
          <Card className='mb-4'>
            <Form form={topForm}>
              <div className='flex w-full gap-1 justify-between'>
                <Form.Item
                  label='Type'
                  name='prompt_type'
                  className='w-2/5'
                  rules={[{ required: true, message: t('select_type') }]}
                >
                  <Select options={TypeOptions} placeholder={t('select_type')} allowClear />
                </Form.Item>
                <Form.Item name='target' className='w-3/5' rules={[{ required: true, message: t('select_scene') }]}>
                  <Select
                    loading={loading}
                    placeholder={t('select_scene')}
                    allowClear
                    showSearch
                    onChange={async value => {
                      await getTemplate(value);
                    }}
                  >
                    {targetOptions?.map(option => (
                      <Select.Option key={option.value} title={option.desc}>
                        {option.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>
              {type === 'edit' && (
                <Form.Item label='Code' name='prompt_code'>
                  <Input disabled />
                </Form.Item>
              )}
              <Form.Item
                label='Name'
                name='prompt_name'
                className='m-0'
                rules={[{ required: true, message: t('Please_input_prompt_name') }]}
              >
                <Input placeholder={t('Please_input_prompt_name')} />
              </Form.Item>
            </Form>
          </Card>
          <Card title={t('input_parameter')} className='mb-4'>
            <Form form={midForm}>
              {variables.length > 0 &&
                variables
                  .filter(item => item !== 'out_schema')
                  .map(item => (
                    // rules={[{ message: `${t('Please_Input')}${item}` }]}
                    <Form.Item key={item} label={item} name={item} >
                      <Input placeholder={t('Please_Input')} />
                    </Form.Item>
                  ))}
            </Form>
          </Card>
          <Card title={t('output_structure')} className='flex flex-col flex-1'>
            <JsonView
              style={{ ...theme, width: '100%', padding: 4 }}
              className={classNames({
                'bg-[#fafafa]': mode === 'light',
              })}
              value={responseTemplate}
              enableClipboard={false}
              displayDataTypes={false}
              objectSortKeys={false}
            />
            <div className='flex flex-col mt-4'>
              <Form
                form={bottomForm}
                initialValues={{
                  model: model,
                  prompt_language: 'en',
                }}
              >
                <Form.Item label={t('model')} name='model'>
                  <Select className='h-8 rounded-3xl' options={modelOptions} allowClear showSearch />
                </Form.Item>
                <Form.Item label={t('language')} name='prompt_language'>
                  <Select
                    options={[
                      {
                        label: t('English'),
                        value: 'en',
                      },
                      {
                        label: t('Chinese'),
                        value: 'zh',
                      },
                    ]}
                  />
                </Form.Item>
                <Form.Item label={t('User_input')} name='user_input'>
                  <Input placeholder={t('Please_Input')} />
                </Form.Item>
              </Form>
            </div>
            <Space className='flex justify-between'>
              <Button type='primary' onClick={onLLMTest} loading={llmLoading}>
                {t('LLM_test')}
              </Button>
              <Button
                type='primary'
                onClick={async () => {
                  if (verifyLoading || !history[0]?.context) {
                    return;
                  }
                  await run();
                }}
              >
                {t('Output_verification')}
              </Button>
            </Space>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default AddOrEditPrompt;

