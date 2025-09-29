#!/usr/bin/env python3
"""
清理数据库中的 DataExpert 相关配置脚本
"""
import sqlite3
import os
import sys

def clean_dataexpert_config():
    """清理数据库中的 DataExpert 相关配置"""
    
    # 数据库文件路径
    db_paths = [
        "pilot/meta_data/derisk.db",
        "pilot/data/default_sqlite.db"
    ]
    
    # 要清理的应用代码
    app_codes_to_remove = [
        "data_analysis_expert",
        "chat_excel",
        "excel_analysis"
    ]
    
    # 要清理的 Agent 名称
    agent_names_to_remove = [
        "ExcelAnalysisExpert",
        "ExcelAnalyzeAgent"
    ]
    
    for db_path in db_paths:
        if os.path.exists(db_path):
            print(f"正在清理数据库: {db_path}")
            try:
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                
                # 获取所有表名
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                tables = cursor.fetchall()
                
                for table in tables:
                    table_name = table[0]
                    print(f"检查表: {table_name}")
                    
                    # 获取表结构
                    cursor.execute(f"PRAGMA table_info({table_name});")
                    columns = cursor.fetchall()
                    column_names = [col[1] for col in columns]
                    
                    # 清理包含 app_code 的记录
                    if 'app_code' in column_names:
                        for app_code in app_codes_to_remove:
                            cursor.execute(f"DELETE FROM {table_name} WHERE app_code = ?", (app_code,))
                            deleted = cursor.rowcount
                            if deleted > 0:
                                print(f"  从 {table_name} 删除了 {deleted} 条 app_code='{app_code}' 的记录")
                    
                    # 清理包含 agent_name 的记录
                    if 'agent_name' in column_names:
                        for agent_name in agent_names_to_remove:
                            cursor.execute(f"DELETE FROM {table_name} WHERE agent_name = ?", (agent_name,))
                            deleted = cursor.rowcount
                            if deleted > 0:
                                print(f"  从 {table_name} 删除了 {deleted} 条 agent_name='{agent_name}' 的记录")
                    
                    # 清理包含 name 字段的记录
                    if 'name' in column_names:
                        for name in app_codes_to_remove + agent_names_to_remove:
                            cursor.execute(f"DELETE FROM {table_name} WHERE name = ?", (name,))
                            deleted = cursor.rowcount
                            if deleted > 0:
                                print(f"  从 {table_name} 删除了 {deleted} 条 name='{name}' 的记录")
                    
                    # 清理包含 DataExpert 或 Excel 关键词的记录
                    text_columns = ['description', 'content', 'prompt_content', 'config', 'details']
                    for col in text_columns:
                        if col in column_names:
                            keywords = ['DataExpert', 'ExcelAnalysis', 'data_analysis_expert', 'chat_excel']
                            for keyword in keywords:
                                cursor.execute(f"DELETE FROM {table_name} WHERE {col} LIKE ?", (f'%{keyword}%',))
                                deleted = cursor.rowcount
                                if deleted > 0:
                                    print(f"  从 {table_name} 删除了 {deleted} 条包含 '{keyword}' 的记录")
                
                conn.commit()
                conn.close()
                print(f"数据库 {db_path} 清理完成")
                
            except Exception as e:
                print(f"清理数据库 {db_path} 时出错: {e}")
        else:
            print(f"数据库文件不存在: {db_path}")

if __name__ == "__main__":
    print("开始清理 DataExpert 相关配置...")
    clean_dataexpert_config()
    print("清理完成！")
