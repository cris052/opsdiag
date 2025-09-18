'use client';
import { apiInterceptors, delDialogue, getAppList, getDialogueListBByFilter, newDialogue } from '@/client/api';
import { ChatContext } from '@/contexts';
import { IApp } from '@/types/app';
import { STORAGE_LANG_KEY, STORAGE_THEME_KEY } from '@/utils/constants/index';
import Icon, {
  ClockCircleOutlined,
  ConsoleSqlOutlined,
  DeleteOutlined,
  GlobalOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageOutlined,
  PartitionOutlined,
  SettingOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { App, Flex, Input, Popover, Spin, Tooltip, Typography } from 'antd';
import cls from 'classnames';
import moment from 'moment';
import 'moment/locale/zh-cn';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ModelSvg from '../icons/model-svg';
import MenuList from './menlist';
import UserBar from './user-bar';
import copy from 'copy-to-clipboard';

type SettingItem = {
  key: string;
  name: string;
  icon: ReactNode;
  noDropdownItem?: boolean;
  onClick?: () => void;
  items?: any[];
  onSelect?: (p: { key: string }) => void;
  defaultSelectedKeys?: string[];
  placement?: 'top' | 'topLeft';
  disable?: boolean;
};

export type RouteItem = {
  key: string;
  name: string;
  icon?: ReactNode;
  path?: string;
  isActive?: boolean;
  children?: RouteItem[];
  hideInMenu?: boolean;
};

interface Dialogue {
  chat_mode: string;
  conv_uid: string;
  user_input?: string;
  select_param?: string;
  app_code?: string; // Added property to fix type error
  // Add other properties if needed
}

interface DialogueListItem {
  key: string;
  name: string | undefined;
  path: string;
  dialogue: Dialogue;
}

function smallMenuItemStyle(active?: boolean) {
  return `flex items-center justify-center mx-auto rounded w-14 h-14 text-xl hover:bg-[#F1F5F9] dark:hover:bg-theme-dark transition-colors cursor-pointer ${
    active ? 'bg-[#F1F5F9] dark:bg-theme-dark' : ''
  }`;
}

const MenuItem: React.FC<{
  item: any;
  refresh?: any;
  order: React.MutableRefObject<number>;
  historyLoading?: boolean;
  loading?: boolean;
}> = ({ item, refresh, historyLoading, loading }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatId = searchParams?.get('conv_uid') ?? '';
  const appCode = searchParams?.get('app_code') ?? '';
  const { modal, message } = App.useApp();
  const { refreshDialogList } = useContext(ChatContext);

  // 删除会话
  const handleDelChat = () => {
    modal.confirm({
      title: t('delete_chat'),
      content: t('delete_chat_confirm'),
      centered: true,
      onOk: async () => {
        const [err] = await apiInterceptors(delDialogue(item.conv_uid));
        if (err) {
          return;
        }
        refreshDialogList && (await refreshDialogList());
        router.push(`/chat`);
      },
    });
  };

  if (loading) {
    return (
      <Flex align='center' className='w-full h-10 px-3 rounded-lg mb-1'>
        <div className='flex items-center justify-center w-6 h-6 rounded-lg mr-3'>
          <Spin size='small' />
        </div>
        <div className='flex-1 min-w-0'>
          <div className='h-4 bg-gray-200 rounded animate-pulse'></div>
        </div>
      </Flex>
    );
  }
  const isActive = chatId === item.conv_uid && appCode === item.app_code;

  return (
    <Flex
      align='center'
      className={cls(`group/item w-full cursor-pointer relative max-w-full`, )}
      onClick={() => {
        if (historyLoading) {
          return;
        }
        router.push(`/chat/?conv_uid=${item.conv_uid}&app_code=${item.app_code}`);
      }}
    >
      <Tooltip title={item.chat_mode}>
        {typeof item.icon === 'string' ? (
          <img src={item.icon} className='flex-shrink-0 w-6 h-6 rounded-lg mr-3' />
        ) : (
          <div className='flex items-center justify-center w-6 h-6 rounded-lg flex-shrink-0'>{item.icon}</div>
        )}
      </Tooltip>
      <div className={cls('flex-1 flex flex-row min-w-0 overflow-hidden hover:bg-slate-100 dark:hover:bg-theme-dark rounded-md px-3 py-1', {
        'bg-white dark:bg-black': isActive,
      })}>
        <div className='flex-1 min-w-0 overflow-hidden hover:bg-slate-100 dark:hover:bg-theme-dark'>
          <Typography.Text
            ellipsis={{
              tooltip: true,
            }}
            className='block text-gray-500 text-[14px]'
          >
            {item.label}
          </Typography.Text>
          {/* 第二行：用户名和创建时间 */}
          <div className='flex text-xs text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis'>
            <span className='mr-2'>{item.user_name}</span>
            <span>{item.gmt_created ? moment(item.gmt_created).format('YYYY-MM-DD HH:mm') : item.gmt_modified}</span>
          </div>
        </div>
        <div className='flex gap-1 ml-1 flex-shrink-0'>
          <div
            className='group-hover/item:opacity-100 cursor-pointer opacity-0'
            onClick={e => {
              e.stopPropagation();
            }}
          >
            <ShareAltOutlined
              style={{ fontSize: 16 }}
              onClick={() => {
                const success = copy(`${location.origin}/chat?scene=${item.chat_mode}&id=${item.conv_uid}`);
                message[success ? 'success' : 'error'](success ? t('copy_success') : t('copy_failed'));
              }}
            />
          </div>
          <div
            className='group-hover/item:opacity-100 cursor-pointer opacity-0'
            onClick={e => {
              e.stopPropagation();
              handleDelChat();
            }}
          >
            <DeleteOutlined style={{ fontSize: 16 }} />
          </div>
        </div>
      </div>
    </Flex>
  );
};

function SideBar() {
  const { isMenuExpand, setIsMenuExpand, mode, setMode, dialogueList } = useContext(ChatContext);
  const pathname = usePathname();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [logo, setLogo] = useState<string>('/logo_zh_latest.png');
  const [appList, setAppList] = useState<IApp[]>([]);
  const [dialogueLists, setDialogueLists] = useState<DialogueListItem[]>([]);
  const [searchValue, setSearchValue] = useState<string>('');

  const handleToggleMenu = useCallback(() => {
    setIsMenuExpand(!isMenuExpand);
  }, [isMenuExpand, setIsMenuExpand]);

  const handleToggleTheme = useCallback(() => {
    const theme = mode === 'light' ? 'dark' : 'light';
    setMode(theme);
    localStorage.setItem(STORAGE_THEME_KEY, theme);
  }, [mode, setMode]);

  const {
    run: fetchDialogueList,
    loading: listLoading,
  } = useRequest(async (name: string) => {
    return await apiInterceptors(getDialogueListBByFilter(name));
  },
   {
      manual: true,
      onSuccess: data => {
        if (data && data[1]) {
          const di = (data[1] as unknown as Dialogue[]).map(
            (dialogue: Dialogue): DialogueListItem => ({
              key: dialogue?.conv_uid,
              name: dialogue.user_input || dialogue.select_param,
              path: '/',
              dialogue: dialogue,
            }),
          );
          setDialogueLists(di);
        } else {
          setDialogueLists([]);
        }
      },
    },
 );

  useEffect(() => {
    fetchAppList();
  }, []);

  const { run: fetchAppList, loading: appListLoading } = useRequest(
    async () => {
      const [_, data] = await apiInterceptors(
        getAppList({
          page: 1,
          page_size: 10,
          published: true,
        }),
      );
      return data;
    },
    {
      manual: true,
      onSuccess: data => {
        if (data) {
          setAppList(data.app_list || []);
        }
      },
    },
  );
  // 暂时注释，后续完善中英文
  const handleChangeLang = useCallback(() => {
    // const language = i18n.language === 'en' ? 'zh' : 'en';
    // i18n.changeLanguage(language);
    // if (language === 'zh') moment.locale('zh-cn');
    // if (language === 'en') moment.locale('en');
    // localStorage.setItem(STORAGE_LANG_KEY, language);
  }, [i18n]);
  const settings = useMemo(() => {
    const items: SettingItem[] = [
      // {
      //   key: 'theme',
      //   name: t('Theme'),
      //   icon: mode === 'dark' ? <Icon component={DarkSvg} /> : <Icon component={SunnySvg} />,
      //   items: [
      //     {
      //       key: 'light',
      //       label: (
      //         <div className='py-1 flex justify-between gap-8 '>
      //           <span className='flex gap-2 items-center'>
      //             <Image src='/pictures/theme_light.png' alt='english' width={38} height={32}></Image>
      //             <span>Light</span>
      //           </span>
      //           <span
      //             className={cls({
      //               block: mode === 'light',
      //               hidden: mode !== 'light',
      //             })}
      //           >
      //             ✓
      //           </span>
      //         </div>
      //       ),
      //     },
      //     {
      //       key: 'dark',
      //       label: (
      //         <div className='py-1 flex justify-between gap-8 '>
      //           <span className='flex gap-2 items-center'>
      //             <Image src='/pictures/theme_dark.png' alt='english' width={38} height={32}></Image>
      //             <span>Dark</span>
      //           </span>
      //           <span
      //             className={cls({
      //               block: mode === 'dark',
      //               hidden: mode !== 'dark',
      //             })}
      //           >
      //             ✓
      //           </span>
      //         </div>
      //       ),
      //     },
      //   ],
      //   onClick: handleToggleTheme,
      //   onSelect: ({ key }: { key: string }) => {
      //     if (mode === key) return;
      //     setMode(key as 'light' | 'dark');
      //     localStorage.setItem(STORAGE_THEME_KEY, key);
      //   },
      //   defaultSelectedKeys: [mode],
      //   placement: 'topLeft',
      // },
      {
        key: 'fold',
        name: t(isMenuExpand ? 'Close_Sidebar' : 'Show_Sidebar'),
        icon: isMenuExpand ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />,
        onClick: handleToggleMenu,
        noDropdownItem: true,
      },
    ];
    return items;
  }, [t, isMenuExpand, handleToggleMenu]);

  const handleChat = async (app: IApp) => {
    const [, res] = await apiInterceptors(newDialogue({ app_code: app.app_code }));
    if (res) {
      window.open(`/chat/?app_code=${app.app_code}&conv_uid=${res.conv_uid}&isNew=true`, '_blank');
    }
  };

  const searchParams = useSearchParams();
  const appLists = useMemo(() => {
    const currentAppCode = searchParams?.get('app_code');
    const isNew = Boolean(searchParams?.get('isNew'));
    return appList.map(app => ({
      key: app.app_code,
      name: app.app_name,
      icon: (
        <Image
          key='image_chat'
          src={app.icon || '/pictures/chat.png'}
          alt='chat_image'
          width={24}
          height={24}
          className='w-6 h-6 rounded-2xl'
        />
      ),
      path: '/',
      app: app,
      isActive: pathname.startsWith('/chat') && (currentAppCode === app.app_code) && isNew,
    }));
  }, [appList, pathname, searchParams]);

  useEffect(() => {
     if (dialogueList && dialogueList[1]) {
      const di =  (dialogueList[1] as unknown as Dialogue[]).map(
        (dialogue: Dialogue): DialogueListItem => ({
          key: dialogue?.conv_uid,
          name: dialogue.user_input || dialogue.select_param,
          path: '/',
          dialogue: dialogue,
        }),
      );
     setDialogueLists(di);
    }

  }, [dialogueList]);

  const functions = useMemo(() => {
    const currentAppCode = searchParams?.get('app_code');
    const items: RouteItem[] = [
      {
      key: 'chat',
      name: t('chat_online'),
      icon: (
        <Image
        key='image_chat'
        src={pathname.startsWith('/chat') ? '/pictures/chat_active.png' : '/pictures/chat.png'}
        alt='chat_image'
        width={24}
        height={24}
        className='w-6 h-6'
        />
      ),
      path: '/chat/',
      isActive: (pathname === '/chat' || pathname === '/chat/') && !currentAppCode,
      },
      ...appLists,
      {
        key: 'script-collection',
        name: '智能采集脚本',
        isActive: pathname.startsWith('/script-collection'),
        icon: (
          <i className="fas fa-terminal w-6 h-6 text-slate-600 dark:text-slate-300 flex items-center justify-center"></i>
        ),
        path: '/script-collection',
      },
      {
        key: 'intelligent-scripts',
        name: '故障根因诊断',
        isActive: pathname.startsWith('/intelligent-scripts'),
        icon: (
          <i className="fas fa-code w-6 h-6 text-slate-600 dark:text-slate-300 flex items-center justify-center"></i>
        ),
        path: '/intelligent-scripts',
      },
      {
        key: 'dashboard',
        name: '仪表盘',
        isActive: pathname.startsWith('/dashboard'),
        icon: (
          <i className="fas fa-tachometer-alt w-6 h-6 text-slate-600 dark:text-slate-300 flex items-center justify-center"></i>
        ),
        path: '/dashboard',
      },
      {
      key: 'application',
      name: t('application'),
      isActive: pathname.startsWith('/application'),
      icon: (
        <Image
        key='image_application'
        src={pathname.startsWith('/application') ? '/pictures/app_active.png' : '/pictures/app.png'}
        alt='application_image'
        width={24}
        height={24}
        className='w-6 h-6'
        />
      ),
      path: '/application/app',
      },
      {
        key: 'models',
        name: t('model_manage'),
        isActive: pathname.startsWith('/models'),
        icon: (
          <Icon component={ModelSvg} className='w-6 h-6 text-slate-600 dark:text-slate-300' />
        ),
        path: '/models',
      },
      {
        key: 'knowledge',
        name: t('Knowledge_Space'),
        isActive: pathname.startsWith('/knowledge'),
        icon: <PartitionOutlined className='w-6 h-6 text-slate-600 dark:text-slate-300' />,
        path: '/knowledge',
      },
      {
        key: 'MCP',
        name: 'MCP',
        isActive: pathname.startsWith('/mcp'),
        icon: <ConsoleSqlOutlined className='w-6 h-6 text-slate-600 dark:text-slate-300' />,
        path: '/mcp',
      },
      {
        key: 'prompt',
        name: t('Prompt'),
        isActive: pathname.startsWith('/prompt'),
        icon: <MessageOutlined className='w-6 h-6 text-slate-600 dark:text-slate-300' />,
        path: '/prompt',
      },
    ];
    return items;
  }, [t, pathname, appLists]);

  useEffect(() => {
    const language = i18n.language;
    if (language === 'zh') moment.locale('zh-cn');
    if (language === 'en') moment.locale('en');
  }, []);

  useEffect(() => {
    setLogo(mode === 'dark' ? '/logo_s_latest.png' : '/logo_zh_latest.png');
  }, [mode]);

  const handleSearch = (value: string) => {
    setSearchValue(value);
    if (value.trim()) {
      fetchDialogueList(value);
    } else {
      // 如果搜索框为空，显示原始列表
      if (dialogueList && dialogueList[1]) {
        const di = (dialogueList[1] as unknown as Dialogue[]).map(
          (dialogue: Dialogue): DialogueListItem => ({
            key: dialogue?.conv_uid,
            name: dialogue.user_input || dialogue.select_param,
            path: '/',
            dialogue: dialogue,
          }),
        );
        setDialogueLists(di);
      }
    }
  };

  if (pathname === '/') return null;

  if (!isMenuExpand) {
    return (
      <div className='flex flex-col justify-between pt-4 h-screen bg-bar dark:bg-[#232734] animate-fade animate-duration-300 '>
        <div>
          <Link href='/' className='flex justify-center items-center pb-4'>
            <Image src={isMenuExpand ? logo : '/LOGO_SMALL.png'} alt='DB-GPT' width={40} height={40} />
          </Link>
          <div className='flex flex-col gap-3 items-center'>
            {functions.map(item => {
              if ((item as any).app) {
                return (
                  <div className='h-10 flex items-center justify-center' onClick={() => handleChat((item as any).app)} key={item.key + Date.now()}>
                    <div className='w-8 h-8 items-center justify-center'>{item.icon}</div>
                  </div>
                );
              }

              return (
                <Link key={item.key} className='h-10 flex items-center justify-center' href={item.path || '#'}>
                  <div className='w-8 h-8 flex items-center justify-center'>{item.icon}</div>
                </Link>
              );
            })}
          </div>
        </div>
        <div className='py-4'>
          <UserBar onlyAvatar />
          {settings
            .filter(item => item.noDropdownItem)
            .map(item => (
              <Tooltip key={item.key} title={item.name} placement='right'>
                <div className={smallMenuItemStyle()} onClick={item.onClick}>
                  {item.icon}
                </div>
              </Tooltip>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cls(
        'flex flex-col justify-between flex-1 px-4 pt-2 overflow-hidden',
        'bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800',
        'animate-fade animate-duration-300 max-w-[260px] border-r border-slate-200 dark:border-slate-700 shadow-lg',
      )}
    >
      <div className='flex flex-col w-full'>
        {/* LOGO */}
        <Link href='/' className='flex ml-[-10px] mt-[-8px] flex-row justify-space-between items-center mb-4'>
          <div className='px-4 py-2 bg-gradient-to-r from-violet-500 via-cyan-500 to-emerald-500 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105'>
            <Image src={isMenuExpand ? logo : '/LOGO_SMALL.png'} alt='DB-GPT' width={130} height={30} className='brightness-0 invert' />
          </div>
        </Link>
        {/* functions */}
        <div className='flex flex-col flex-1 w-full' key={Date.now()}>
          {functions.map(item => {
            // 应用列表项单独处理点击事件
            if ((item as any).app) {
              return (
                <div
                  onClick={() => handleChat((item as any).app)}
                  className={cls(
                    'flex items-center w-full h-10 cursor-pointer text-slate-700 dark:text-slate-200 pl-3 mb-0.5 rounded-xl transition-all duration-300 group',
                    'hover:bg-gradient-to-r hover:from-violet-50 hover:via-cyan-50 hover:to-emerald-50 hover:shadow-md hover:scale-[1.02]',
                    'dark:hover:from-violet-900/30 dark:hover:via-cyan-900/30 dark:hover:to-emerald-900/30',
                    { 'bg-gradient-to-r from-violet-100 via-cyan-100 to-emerald-100 dark:from-violet-800/40 dark:via-cyan-800/40 dark:to-emerald-800/40 shadow-md scale-[1.02]': item.isActive },
                  )}
                  key={item.key + Date.now()}
                >
                  <div className='mr-4 w-6 h-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300'>{item.icon}</div>
                  <span className='text-sm font-medium group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors duration-300'>{item.name}</span>
                </div>
              );
            }

            return (
              <Link
                href={item.path ?? '/'}
                className={cls(
                  'flex items-center w-full h-10 cursor-pointer text-slate-700 dark:text-slate-200 pl-3 mb-0.5 rounded-xl transition-all duration-300 group',
                  'hover:bg-gradient-to-r hover:from-violet-50 hover:via-cyan-50 hover:to-emerald-50 hover:shadow-md hover:scale-[1.02]',
                  'dark:hover:from-violet-900/30 dark:hover:via-cyan-900/30 dark:hover:to-emerald-900/30',
                  { 'bg-gradient-to-r from-violet-100 via-cyan-100 to-emerald-100 dark:from-violet-800/40 dark:via-cyan-800/40 dark:to-emerald-800/40 shadow-md scale-[1.02]': item.isActive },
                  {'border-t border-slate-200 dark:border-slate-600 mt-2': item.key === 'dashboard'}
                )}
                key={item.key}
              >
                <div className='mr-4 w-6 h-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300'>{item.icon}</div>
                <span className='text-sm font-medium group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors duration-300'>{t(item.name as any)}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* dialog */}
      <div className="text-base flex flex-row items-center font-semibold text-sm py-3 px-3 border-t border-slate-200 dark:border-slate-600 mt-2 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-t-xl">
        <div className='mr-3 w-8 h-8 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-md'>
          <ClockCircleOutlined className='text-white text-sm' />
        </div>
        <span className='text-slate-700 dark:text-slate-200'>历史会话</span>
      </div>
      
      {/* 筛选框 */}
      <div className='pb-3 px-3 bg-gradient-to-b from-slate-100 to-white dark:from-slate-700 dark:to-slate-800'>
        <Input.Search
          placeholder="搜索会话..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onSearch={handleSearch}
          allowClear
          loading={listLoading}
          className='rounded-xl shadow-sm border-slate-200 dark:border-slate-600'
          style={{
            borderRadius: '12px',
          }}
        />
      </div>

      <div className='flex-1 overflow-y-auto bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 px-2'>
        {listLoading ? (
          // 显示加载状态
          Array.from({ length: 3 }).map((_, index) => (
            <MenuItem
              key={`loading-${index}`}
              item={{}}
              order={{ current: 0 }}
              loading={true}
            />
          ))
        ) : dialogueLists.length > 0 ? (
          dialogueLists.map(item => (
            <MenuItem
              key={item.key}
              item={{
                label: item.name || 'Untitled',
                app_code: item.dialogue.app_code || '',
                ...item.dialogue,
                default: false,
              }}
              order={{ current: 0 }}
            />
          ))
        ) : (
          <div className='px-8 text-gray-500 text-sm py-4'>
            {searchValue ? '未找到匹配的会话' : '暂无历史会话'}
          </div>
        )}
      </div>

      {/* Settings */}
      <div className='py-2'>
        <div className='flex items-center justify-between w-full h-12 px-4 bg-gradient-to-r from-slate-100 via-white to-slate-100 dark:from-slate-700 dark:via-slate-800 dark:to-slate-700 rounded-2xl shadow-md border border-slate-200 dark:border-slate-600'>
          <div className='flex-1'>
            <UserBar />
          </div>
          <div className='flex items-center space-x-2'>
            {settings.map(item => (
              <div key={item.key}>
                <Popover content={item.name}>
                  <div className={cls('flex items-center justify-center cursor-pointer text-lg p-2 rounded-lg hover:bg-gradient-to-r hover:from-violet-50 hover:to-cyan-50 dark:hover:from-violet-900/30 dark:hover:to-cyan-900/30 transition-all duration-300 hover:scale-110', { 'text-slate-400 dark:text-slate-500': item.disable, 'text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400': !item.disable })} onClick={item.onClick}>
                    {item.icon}
                  </div>
                </Popover>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SideBar;
