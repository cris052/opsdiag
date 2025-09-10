#!/usr/bin/env python3
"""
OpenDeRisk 缓存清理脚本 (跨平台)
支持 Windows, Linux, macOS

使用方法:
    python scripts/clear_cache.py
    python scripts/clear_cache.py --all  # 清理所有缓存包括虚拟环境
    python scripts/clear_cache.py --dry-run  # 预览要删除的文件
"""

import os
import sys
import shutil
import argparse
import subprocess
from pathlib import Path
from typing import List, Set


class CacheCleaner:
    """OpenDeRisk缓存清理器"""
    
    def __init__(self, project_root: Path, dry_run: bool = False):
        self.project_root = project_root
        self.dry_run = dry_run
        self.deleted_files: Set[str] = set()
        self.deleted_dirs: Set[str] = set()
        
    def log(self, message: str, level: str = "INFO"):
        """输出日志信息"""
        print(f"[{level}] {message}")
        
    def safe_remove_file(self, file_path: Path) -> bool:
        """安全删除文件"""
        try:
            if file_path.exists():
                if self.dry_run:
                    self.log(f"[DRY-RUN] 将删除文件: {file_path}")
                    return True
                else:
                    file_path.unlink()
                    self.deleted_files.add(str(file_path))
                    return True
        except Exception as e:
            self.log(f"删除文件失败 {file_path}: {e}", "ERROR")
        return False
        
    def safe_remove_dir(self, dir_path: Path) -> bool:
        """安全删除目录"""
        try:
            if dir_path.exists() and dir_path.is_dir():
                if self.dry_run:
                    self.log(f"[DRY-RUN] 将删除目录: {dir_path}")
                    return True
                else:
                    shutil.rmtree(dir_path)
                    self.deleted_dirs.add(str(dir_path))
                    return True
        except Exception as e:
            self.log(f"删除目录失败 {dir_path}: {e}", "ERROR")
        return False
        
    def clean_python_cache(self):
        """清理Python缓存文件"""
        self.log("清理Python缓存文件...")
        
        # 清理__pycache__目录
        pycache_dirs = list(self.project_root.rglob("__pycache__"))
        self.log(f"找到 {len(pycache_dirs)} 个__pycache__目录")
        for pycache_dir in pycache_dirs:
            self.safe_remove_dir(pycache_dir)
            
        # 清理.pyc文件
        pyc_files = list(self.project_root.rglob("*.pyc"))
        self.log(f"找到 {len(pyc_files)} 个.pyc文件")
        for pyc_file in pyc_files:
            self.safe_remove_file(pyc_file)
            
        # 清理.pyo文件
        pyo_files = list(self.project_root.rglob("*.pyo"))
        self.log(f"找到 {len(pyo_files)} 个.pyo文件")
        for pyo_file in pyo_files:
            self.safe_remove_file(pyo_file)
            
    def clean_message_cache(self):
        """清理消息缓存"""
        self.log("清理消息缓存...")
        cache_dir = self.project_root / "pilot" / "message" / "cache"
        if cache_dir.exists():
            self.safe_remove_dir(cache_dir)
        else:
            self.log("消息缓存目录不存在，跳过")
            
    def clean_vector_db_cache(self):
        """清理向量数据库缓存"""
        self.log("清理向量数据库缓存...")
        data_dir = self.project_root / "pilot" / "data"
        if data_dir.exists():
            self.safe_remove_dir(data_dir)
        else:
            self.log("向量数据库缓存不存在，跳过")
            
    def clean_temp_files(self):
        """清理临时文件和日志"""
        self.log("清理临时文件和日志...")
        
        # 清理.tmp文件
        tmp_files = list(self.project_root.rglob("*.tmp"))
        self.log(f"找到 {len(tmp_files)} 个临时文件")
        for tmp_file in tmp_files:
            self.safe_remove_file(tmp_file)
            
        # 清理.log文件
        log_files = list(self.project_root.rglob("*.log"))
        self.log(f"找到 {len(log_files)} 个日志文件")
        for log_file in log_files:
            self.safe_remove_file(log_file)
            
    def clean_web_cache(self):
        """清理Web前端缓存"""
        self.log("清理Web前端缓存...")
        
        web_dir = self.project_root / "web"
        if not web_dir.exists():
            self.log("Web目录不存在，跳过")
            return
            
        # 清理node_modules
        node_modules = web_dir / "node_modules"
        if node_modules.exists():
            self.safe_remove_dir(node_modules)
            
        # 清理Next.js缓存
        next_cache = web_dir / ".next"
        if next_cache.exists():
            self.safe_remove_dir(next_cache)
            
        # 清理其他前端缓存
        for cache_dir in [".nuxt", "dist", "build"]:
            cache_path = web_dir / cache_dir
            if cache_path.exists():
                self.safe_remove_dir(cache_path)
                
    def clean_python_env(self):
        """清理Python虚拟环境（需要用户确认）"""
        venv_dirs = [".venv", "venv", "env"]
        
        for venv_name in venv_dirs:
            venv_path = self.project_root / venv_name
            if venv_path.exists():
                if self.dry_run:
                    self.log(f"[DRY-RUN] 发现虚拟环境: {venv_path}")
                    continue
                    
                response = input(f"发现Python虚拟环境 {venv_path}，是否删除? (y/N): ")
                if response.lower() in ['y', 'yes']:
                    self.safe_remove_dir(venv_path)
                else:
                    self.log(f"跳过虚拟环境: {venv_path}")
                    
    def clean_package_manager_cache(self):
        """清理包管理器缓存"""
        self.log("清理包管理器缓存...")
        
        # 清理pip缓存
        try:
            result = subprocess.run(['pip', 'cache', 'purge'], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                self.log("✓ pip缓存清理完成")
            else:
                self.log("pip缓存清理失败或pip不可用")
        except FileNotFoundError:
            self.log("pip命令不可用，跳过pip缓存清理")
            
        # 清理uv缓存
        try:
            result = subprocess.run(['uv', 'cache', 'clean'], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                self.log("✓ uv缓存清理完成")
            else:
                self.log("uv缓存清理失败或uv不可用")
        except FileNotFoundError:
            self.log("uv命令不可用，跳过uv缓存清理")
            
    def clean_all(self, include_env: bool = False):
        """执行完整的缓存清理"""
        self.log("========================================")
        self.log("OpenDeRisk 缓存清理脚本 (Python跨平台版)")
        self.log("========================================")
        self.log(f"项目根目录: {self.project_root}")
        if self.dry_run:
            self.log("*** 预览模式 - 不会实际删除文件 ***")
        self.log("")
        
        # 执行各项清理任务
        self.clean_python_cache()
        self.clean_message_cache()
        self.clean_vector_db_cache()
        self.clean_temp_files()
        self.clean_web_cache()
        
        if include_env:
            self.clean_python_env()
            
        if not self.dry_run:
            self.clean_package_manager_cache()
        
        # 输出清理结果
        self.log("")
        self.log("========================================")
        self.log("缓存清理完成！")
        self.log("========================================")
        
        if not self.dry_run:
            self.log(f"删除了 {len(self.deleted_files)} 个文件")
            self.log(f"删除了 {len(self.deleted_dirs)} 个目录")
            self.log("")
            self.log("建议操作:")
            self.log("1. 重新安装依赖: uv sync --all-packages")
            self.log("2. 重启服务以确保缓存完全清除")
        else:
            self.log("预览完成，使用 --dry-run=false 执行实际清理")


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description="OpenDeRisk 缓存清理脚本",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
    python scripts/clear_cache.py                # 基础清理
    python scripts/clear_cache.py --all         # 清理所有缓存包括虚拟环境
    python scripts/clear_cache.py --dry-run     # 预览要删除的文件
        """
    )
    
    parser.add_argument(
        '--all', 
        action='store_true',
        help='清理所有缓存，包括虚拟环境'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true', 
        help='预览模式，不实际删除文件'
    )
    
    args = parser.parse_args()
    
    # 获取项目根目录
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    if not project_root.exists():
        print(f"错误: 项目根目录不存在: {project_root}")
        sys.exit(1)
        
    # 创建清理器并执行清理
    cleaner = CacheCleaner(project_root, dry_run=args.dry_run)
    cleaner.clean_all(include_env=args.all)


if __name__ == "__main__":
    main()
