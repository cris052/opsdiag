-- 手动清理 DataExpert 相关配置的 SQL 命令
-- 请在 SQLite 数据库中执行这些命令

-- 1. 删除配置代码为 d4aed605ec8b42ee96fdf6fe907dc892 的记录
DELETE FROM gpts_app_config WHERE code = 'd4aed605ec8b42ee96fdf6fe907dc892';

-- 2. 删除 app_code 为 data_analysis_expert 的所有记录
DELETE FROM gpts_app WHERE app_code = 'data_analysis_expert';
DELETE FROM gpts_app_config WHERE app_code = 'data_analysis_expert';
DELETE FROM gpts_app_detail WHERE app_code = 'data_analysis_expert';

-- 3. 删除包含 ExcelAnalysisExpert 的配置记录
DELETE FROM gpts_app_config WHERE config LIKE '%ExcelAnalysisExpert%';
DELETE FROM gpts_app_config WHERE config LIKE '%data_analysis_expert%';

-- 4. 查看剩余的相关记录（用于验证）
SELECT * FROM gpts_app WHERE app_code LIKE '%excel%' OR app_code LIKE '%data_analysis%';
SELECT * FROM gpts_app_config WHERE app_code LIKE '%excel%' OR app_code LIKE '%data_analysis%';
SELECT * FROM gpts_app_config WHERE code = 'd4aed605ec8b42ee96fdf6fe907dc892';
