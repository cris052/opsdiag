'use client';
import { apiInterceptors, getAppList, newDialogue } from '@/client/api';
import ChatInput from '@/components/chat/input/chat-input';
import { IApp } from '@/types/app';
import { useRequest } from 'ahooks';
import { Card, Tooltip, Spin } from 'antd';
import { t } from 'i18next';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function HomeChat() {
  const [appList, setAppList] = useState<IApp[]>([]);
  const router = useRouter();

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

  const handleChat = async (app: IApp) => {
    const [, res] = await apiInterceptors(newDialogue({ app_code: app.app_code }));
    if (res) {
      router.push(`/chat/?app_code=${app.app_code}&conv_uid=${res.conv_uid}`);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-violet-50 via-cyan-50 to-emerald-50 dark:from-slate-900 dark:via-violet-900 dark:to-emerald-900 relative overflow-hidden'>
      {/* 动态背景装饰 */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        <div className='absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-violet-400/40 to-cyan-500/30 rounded-full blur-3xl animate-pulse'></div>
        <div className='absolute -bottom-40 -left-40 w-[32rem] h-[32rem] bg-gradient-to-tr from-emerald-400/35 to-teal-500/25 rounded-full blur-3xl animate-bounce'></div>
        <div className='absolute top-1/4 right-1/3 w-80 h-80 bg-gradient-to-r from-cyan-300/30 to-violet-400/25 rounded-full blur-2xl animate-pulse delay-1000'></div>
        <div className='absolute bottom-1/3 left-1/4 w-64 h-64 bg-gradient-to-br from-teal-300/35 to-emerald-400/30 rounded-full blur-xl animate-bounce delay-500'></div>
        <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-r from-violet-300/20 to-cyan-300/20 rounded-full blur-2xl animate-spin-slow'></div>
      </div>

      <div className='relative z-10 flex flex-col items-center justify-center min-h-fit py-12 px-6'>
        <div className='w-full max-w-5xl mx-auto'>
          {/* 主标题区域 - 更加突出和现代化 */}
          <div className='text-center mb-16'>
            <div className='inline-flex items-center justify-center p-6 mb-6 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-lg border border-white/40 dark:border-slate-600/40 hover:shadow-xl hover:scale-105 transition-all duration-500 group'>
              <div className='flex items-center justify-center w-12 h-12 bg-gradient-to-br from-violet-500 via-cyan-500 to-emerald-500 rounded-2xl mr-4 shadow-lg group-hover:rotate-12 transition-transform duration-500'>
                <span className='text-xl'>🤖</span>
              </div>
              <div className='text-left'>
                <h1 className='text-xl md:text-2xl lg:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-cyan-600 to-emerald-600 group-hover:scale-105 transition-transform duration-500'>
                  OpsDiag私有云智能助手
                </h1>
              </div>
            </div>
            
            <div className='mb-8'>
              <p className='text-base md:text-lg text-slate-600 dark:text-slate-300 font-medium text-center'>
                智能运维 · 私有部署 · 7×24小时服务
              </p>
            </div>
            
          </div>

          {/* 输入框区域 - 更加精致的设计 */}
          <div className='mb-16'>
            <div className='bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 dark:border-slate-600/50 p-12 hover:shadow-3xl transition-all duration-500 hover:scale-[1.02] transform group'>
              <div className='mb-6'>
                <div className='flex items-center justify-between mb-3'>
                  <h3 className='text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center'>
                    <div className='flex items-center justify-center w-12 h-12 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-2xl mr-4 shadow-lg group-hover:rotate-6 transition-transform duration-300'>
                      <span className='text-lg'>💬</span>
                    </div>
                    开始新的对话
                  </h3>
                  <div className='flex items-center space-x-2'>
                    <div className='w-2 h-2 bg-blue-500 rounded-full'></div>
                    <span className='text-xs text-slate-500 dark:text-slate-400'>实时响应</span>
                  </div>
                </div>
                <p className='text-base text-slate-600 dark:text-slate-300 mb-4'>
                  🚀 输入您的运维问题，我将为您提供专业的解决方案
                </p>
                <div className='flex flex-wrap gap-4 mb-8'>
                  <span className='px-6 py-3 bg-gradient-to-r from-violet-100 to-violet-200 dark:from-violet-900/50 dark:to-violet-800/50 text-violet-700 dark:text-violet-300 rounded-2xl text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 cursor-pointer'>🔍 系统监控</span>
                  <span className='px-6 py-3 bg-gradient-to-r from-cyan-100 to-cyan-200 dark:from-cyan-900/50 dark:to-cyan-800/50 text-cyan-700 dark:text-cyan-300 rounded-2xl text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 cursor-pointer'>🔧 故障诊断</span>
                  <span className='px-6 py-3 bg-gradient-to-r from-emerald-100 to-emerald-200 dark:from-emerald-900/50 dark:to-emerald-800/50 text-emerald-700 dark:text-emerald-300 rounded-2xl text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 cursor-pointer'>⚡ 性能优化</span>
                  <span className='px-6 py-3 bg-gradient-to-r from-teal-100 to-teal-200 dark:from-teal-900/50 dark:to-teal-800/50 text-teal-700 dark:text-teal-300 rounded-2xl text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 cursor-pointer'>🛡️ 安全防护</span>
                </div>
              </div>
              <div className='relative'>
                <div className='absolute -inset-2 bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000'></div>
                <ChatInput 
                  bodyClassName='relative min-h-[140px] bg-gradient-to-br from-violet-50/80 via-white to-cyan-50/80 dark:from-slate-700 dark:via-slate-600 dark:to-slate-600 border-2 border-violet-200 dark:border-violet-700 rounded-3xl shadow-inner focus-within:border-violet-400 dark:focus-within:border-violet-500 focus-within:shadow-xl transition-all duration-500 placeholder:text-slate-400' 
                  minRows={5} 
                  maxRows={10} 
                  cneterBtn={false} 
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
