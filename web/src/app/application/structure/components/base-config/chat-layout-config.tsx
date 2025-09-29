import { Col, Form, FormInstance, Input, Row, Select } from 'antd';
import React, { useEffect } from 'react';
export const MEDIA_RESOURCE_TYPES = [
  'image_file',
  'video_file',
  'text_file',
  'common_file'
];

function ChatLayoutConfig({
  form,
  selectedChatConfigs,
  chatConfigOptions,
  onInputBlur,
  resourceOptions,
  modelOptions,
}: {
  form: FormInstance;
  selectedChatConfigs: string[];
  chatConfigOptions: any[];
  onInputBlur: (fieldName: string) => void;
  resourceOptions: any[];
  modelOptions?: any[];
}) {

  if (!selectedChatConfigs || selectedChatConfigs.length === 0) {
    return null;
  }

  const labelStyle = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  };

  const renderConfigItem = (item: any) => {
    if (!item) return null;

    switch (item.param_type) {
      case 'model':
        return (
          <Row gutter={24} key={item.param_type}>
            <Col span={14} key={`${item.param_type}-col1`}>
              <Form.Item
                label={<span style={labelStyle} title={item.param_description}>{item.param_description}</span>}
                name={item.param_type}
                labelCol={{ flex: '80px' }}
              >
                <Select
                  className='h-10'
                  options={item.sub_types?.map((sub: string) => ({ value: sub, label: sub })) || []}
                  disabled={!item.sub_types}
                  placeholder={`请选择${item.param_description}`}
                  onBlur={() => onInputBlur(`${item.param_type}_value`)}
                />
              </Form.Item>
            </Col>
            <Col span={10} key={`${item.param_type}-col2`}>
              <Form.Item name={`${item.param_type}_value`} initialValue={item.param_default_value}>
                <Select
                  options={modelOptions} 
                  placeholder={`请输入${item.param_description}`} 
                  className='h-10 flex-1'
                />
              </Form.Item>
            </Col>
          </Row>
        );

      case 'temperature':
        return (
          <Row gutter={24} key={item.param_type}>
            <Col span={14} key={`${item.param_type}-col1`}>
              <Form.Item
                label={<span style={labelStyle} title={item.param_description}>{item.param_description}</span>}
                name={item.param_type}
                labelCol={{ flex: '80px' }}
              >
                <Input
                  type='number'
                  step='0.01'
                  disabled={!item.sub_types}
                  placeholder={`请输入${item.param_description}`}
                  className='h-10'
                />
              </Form.Item>
            </Col>
            <Col span={10} key={`${item.param_type}-col2`}>
              <Form.Item name={`${item.param_type}_value`} initialValue={item.param_default_value}>
                <Input 
                  type='number' 
                  step='0.01'
                  placeholder={`请输入${item.param_description}`} 
                  className='h-10' 
                  onBlur={() => onInputBlur(`${item.param_type}_value`)}
                />
              </Form.Item>
            </Col>
          </Row>
        );

      case 'max_new_tokens':
        return (
          <Row gutter={24} key={item.param_type}>
            <Col span={14} key={`${item.param_type}-col1`}>
              <Form.Item
                label={<span style={labelStyle} title={item.param_description}>{item.param_description}</span>}
                name={item.param_type}
                labelCol={{ flex: '80px' }}
              >
                <Input
                  type='text'
                  disabled={!item.sub_types}
                  placeholder={`请输入${item.param_description}`}
                  className='h-10'
                />
              </Form.Item>
            </Col>
            <Col span={10} key={`${item.param_type}-col2`}>
              <Form.Item name={`${item.param_type}_value`} initialValue={item.param_default_value}>
                <Input 
                  type='text'
                  placeholder={`请输入${item.param_description}`} 
                  className='h-10' 
                  onBlur={() => onInputBlur(`${item.param_type}_value`)}
                />
              </Form.Item>
            </Col>
          </Row>
        );

      case 'resource':
        return (
          <Row gutter={24} key={item.param_type}>
            <Col span={14} key={`${item.param_type}-col1`}>
              <Form.Item
                label={<span style={labelStyle} title={item.param_description}>{item.param_description}</span>}
                name={`${item.param_type}_sub_type`}
                labelCol={{ flex: '80px' }}
              >
                <Select
                  className='h-10'
                  options={
                    item.sub_types ? item.sub_types.map((sub: string) => ({ value: sub, label: sub })) || [] : []
                  }
                  placeholder={`请选择${item.param_description}`}
                />
              </Form.Item>
            </Col>
            <Col span={10} key={`${item.param_type}-col2`}>
              <Form.Item name={`${item.param_type}_value`}>
                <Select
                  options={resourceOptions}
                  className='flex-1 h-10'
                  placeholder={`请输入资源`}
                  disabled={MEDIA_RESOURCE_TYPES.includes(form.getFieldValue(`${item.param_type}_sub_type`)) }
                />
              </Form.Item>
            </Col>
          </Row>
        );

      case 'fault_type':
        // 提供兜底选项，确保故障类型始终有数据可选
        const faultTypeOptions = item.param_type_options && item.param_type_options.length > 0 
          ? item.param_type_options 
          : [
              { label: '网络故障', value: '网络故障' },
              { label: '存储故障', value: '存储故障' },
              { label: '计算故障', value: '计算故障' }
            ];
        
        return (
          <Row gutter={24} key={item.param_type}>
            <Col span={24} key={`${item.param_type}-col1`}>
              <Form.Item
                label={<span style={labelStyle} title={item.param_description}>{item.param_description}</span>}
                name={`${item.param_type}_value`}
                labelCol={{ flex: '80px' }}
                initialValue={item.param_default_value || '网络故障'}
              >
                <Select
                  options={faultTypeOptions}
                  className='h-10'
                  placeholder={`请选择故障类型`}
                  onBlur={() => onInputBlur(`${item.param_type}_value`)}
                />
              </Form.Item>
            </Col>
          </Row>
        );

      case 'project_name':
        // 提供兜底选项，确保项目名称始终有数据可选
        const projectNameOptions = item.param_type_options && item.param_type_options.length > 0 
          ? item.param_type_options 
          : [
              { label: '重庆健康云ECS', value: '重庆健康云ECS' },
              { label: '长春政务云ECS', value: '长春政务云ECS' },
              { label: '新疆石河子ECS', value: '新疆石河子ECS' }
            ];
        
        return (
          <Row gutter={24} key={item.param_type}>
            <Col span={24} key={`${item.param_type}-col1`}>
              <Form.Item
                label={<span style={labelStyle} title={item.param_description}>{item.param_description}</span>}
                name={`${item.param_type}_value`}
                labelCol={{ flex: '80px' }}
                initialValue={item.param_default_value || '项目名称'}
              >
                <Select
                  options={projectNameOptions}
                  className='h-10'
                  placeholder={`请选择项目名称`}
                  onBlur={() => onInputBlur(`${item.param_type}_value`)}
                />
              </Form.Item>
            </Col>
          </Row>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {selectedChatConfigs?.map((selectedType: string) => {
        const item = chatConfigOptions?.find((md: any) => md.param_type === selectedType);
        return renderConfigItem(item);
      })}
    </>
  );
}

export default React.memo(ChatLayoutConfig); // 使用 React.memo 优化性能
