#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
删除数据库中火焰图助手相关记录的脚本
"""

import sqlite3
import os
import sys

def remove_flamegraph_from_db():
    """从数据库中删除火焰图助手相关记录"""
    
    db_path = os.path.join(os.path.dirname(__file__), "..", "pilot", "meta_data", "derisk.db")
    
    if not os.path.exists(db_path):
        print(f"数据库文件不存在: {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 查看所有表
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("数据库中的表:")
        for table in tables:
            print(f"  - {table[0]}")
        
        # 删除火焰图助手相关记录
        deleted_count = 0
        
        # 查找包含flamegraph的记录
        for table_name in [t[0] for t in tables]:
            try:
                # 获取表结构
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns = cursor.fetchall()
                
                # 查找可能包含flamegraph信息的列
                text_columns = [col[1] for col in columns if 'TEXT' in col[2] or 'VARCHAR' in col[2]]
                
                for column in text_columns:
                    # 查询包含flamegraph的记录
                    query = f"SELECT COUNT(*) FROM {table_name} WHERE {column} LIKE '%flamegraph%' OR {column} LIKE '%火焰图%'"
                    cursor.execute(query)
                    count = cursor.fetchone()[0]
                    
                    if count > 0:
                        print(f"在表 {table_name}.{column} 中找到 {count} 条相关记录")
                        
                        # 删除记录
                        delete_query = f"DELETE FROM {table_name} WHERE {column} LIKE '%flamegraph%' OR {column} LIKE '%火焰图%'"
                        cursor.execute(delete_query)
                        deleted_count += cursor.rowcount
                        print(f"  已删除 {cursor.rowcount} 条记录")
                        
            except Exception as e:
                print(f"处理表 {table_name} 时出错: {e}")
                continue
        
        # 提交更改
        conn.commit()
        print(f"\n总共删除了 {deleted_count} 条火焰图助手相关记录")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"操作数据库时出错: {e}")
        return False

if __name__ == "__main__":
    print("OpenDerisk 火焰图助手数据库清理工具")
    print("=" * 50)
    
    success = remove_flamegraph_from_db()
    
    if success:
        print("数据库清理完成！")
    else:
        print("数据库清理失败！")
        sys.exit(1)
