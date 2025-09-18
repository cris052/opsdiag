#!/usr/bin/env python3
"""
清理特定配置代码的 DataExpert 引用
"""
import sqlite3
import os
import sys

def clean_specific_config():
    """清理特定配置代码中的 DataExpert 引用"""
    
    # 数据库文件路径
    db_path = "pilot/meta_data/derisk.db"
    
    # 要清理的配置代码
    config_code = "d4aed605ec8b42ee96fdf6fe907dc892"
    
    if not os.path.exists(db_path):
        print(f"数据库文件不存在: {db_path}")
        return
    
    print(f"正在清理数据库: {db_path}")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 查找包含此配置代码的记录
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        for table in tables:
            table_name = table[0]
            
            # 获取表结构
            cursor.execute(f"PRAGMA table_info({table_name});")
            columns = cursor.fetchall()
            column_names = [col[1] for col in columns]
            
            # 查找包含配置代码的记录
            if 'code' in column_names:
                cursor.execute(f"SELECT * FROM {table_name} WHERE code = ?", (config_code,))
                records = cursor.fetchall()
                
                if records:
                    print(f"在表 {table_name} 中找到配置代码 {config_code} 的记录:")
                    for record in records:
                        print(f"  记录: {record}")
                    
                    # 删除这些记录
                    cursor.execute(f"DELETE FROM {table_name} WHERE code = ?", (config_code,))
                    deleted = cursor.rowcount
                    if deleted > 0:
                        print(f"  从 {table_name} 删除了 {deleted} 条记录")
            
            # 同时清理 app_code 为 data_analysis_expert 的记录
            if 'app_code' in column_names:
                cursor.execute(f"SELECT * FROM {table_name} WHERE app_code = ?", ("data_analysis_expert",))
                records = cursor.fetchall()
                
                if records:
                    print(f"在表 {table_name} 中找到 app_code=data_analysis_expert 的记录:")
                    for record in records:
                        print(f"  记录: {record}")
                    
                    # 删除这些记录
                    cursor.execute(f"DELETE FROM {table_name} WHERE app_code = ?", ("data_analysis_expert",))
                    deleted = cursor.rowcount
                    if deleted > 0:
                        print(f"  从 {table_name} 删除了 {deleted} 条记录")
        
        conn.commit()
        conn.close()
        print(f"配置清理完成")
        
    except Exception as e:
        print(f"清理配置时出错: {e}")

if __name__ == "__main__":
    print("开始清理特定配置...")
    clean_specific_config()
    print("清理完成！请重启应用以生效。")
