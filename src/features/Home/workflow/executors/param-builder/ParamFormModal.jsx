import { useEffect, useMemo } from 'react'
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  Empty,
  Typography,
  InputNumber,
  Switch,
  Radio,
  Checkbox,
  Select,
  Row,
  Col
} from 'antd'
import { FolderOpenOutlined, InfoCircleOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { systemService } from '../../../../../services'

const { Text } = Typography
const { TextArea } = Input

export default function ParamFormModal({
  shortcut,
  defaultParams,
  onSubmit,
  onCancel,
  params: paramsOverride
}) {
  const [form] = Form.useForm()

  // 获取 param-builder 执行器及其参数配置
  const paramBuilder = useMemo(
    () => (shortcut?.executors || []).find((e) => e.key === 'param-builder'),
    [shortcut]
  )
  const params = useMemo(() => {
    if (paramsOverride != null) return paramsOverride
    return paramBuilder?.config?.params || []
  }, [paramsOverride, paramBuilder])

  useEffect(() => {
    const initial = { ...defaultParams }
    for (const p of params) {
      if (initial[p.name] == null && p.default) initial[p.name] = p.default
    }
    form.setFieldsValue(initial)
  }, [form, params, defaultParams])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      onSubmit(values)
    } catch (e) {
      /* ignore */
    }
  }

  const handleFileSelect = async (paramName, type) => {
    const options = {
      properties: type === 'directory' ? ['openDirectory'] : ['openFile']
    }
    const result = await systemService.showOpenDialog(options)
    if (result && result.length > 0) {
      form.setFieldValue(paramName, result[0])
    }
  }

  const handleFileSelectForField = async (fieldPath) => {
    const result = await systemService.showOpenDialog({ properties: ['openFile'] })
    if (result && result.length > 0) {
      form.setFieldValue(fieldPath, result[0])
    }
  }

  // 根据参数类型渲染对应的表单控件
  const renderFormControl = (param, visible = true) => {
    const { type = 'text', name, label, placeholder, required, options = [] } = param
    const valueKinds = Array.isArray(param.valueKinds) ? param.valueKinds : (type === 'key-file' ? ['file','text'] : [])

    // 基础校验规则
    const rules = visible && required ? [{ required: true, message: `请填写${label || name}` }] : []

    switch (type) {
      case 'key-value':
      case 'key-file':
        return (
          <Form.List name={name} rules={visible && required ? [{ validator: async (_, value) => { if (!value || value.length === 0) throw new Error(`请添加至少一条${label || name}`) } }] : []}>
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: '100%' }}>
                {fields.map(({ key, name: idx }) => (
                  <Row key={key} gutter={8} align="top" style={{ width: '100%' }}>
                    <Col span={valueKinds.includes('file') ? 6 : 8}>
                      <Form.Item name={[idx, 'key']} rules={[{ required: true, message: '键不能为空' }]}> 
                        <Input placeholder="键" />
                      </Form.Item>
                    </Col>
                    {valueKinds.includes('file') && (
                      <Col span={4}>
                        <Form.Item name={[idx, 'kind']} initialValue={'text'}>
                          <Select options={[{ value: 'text', label: '文本' }, { value: 'file', label: '文件' }]} />
                        </Form.Item>
                      </Col>
                    )}
                    <Col span={valueKinds.includes('file') ? 12 : 14}>
                      <Form.Item name={[idx, 'value']}> 
                        {/(header|query)/i.test(name) ? (
                          <Select mode="tags" placeholder="值（可输入多个）" tokenSeparators={[',']}/>
                        ) : (valueKinds.includes('file') && form.getFieldValue([name, idx, 'kind']) === 'file') ? (
                          <Space.Compact style={{ width: '100%' }}>
                            <Input placeholder="文件路径" />
                            <Button onClick={() => handleFileSelectForField([name, idx, 'value'])}>选择</Button>
                          </Space.Compact>
                        ) : (
                          <Input placeholder="值" />
                        )}
                      </Form.Item>
                    </Col>
                    <Col span={2} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 4 }}>
                      <Button type="text" size="small" icon={<DeleteOutlined />} onClick={() => remove(idx)} />
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} block onClick={() => add({ key: '', kind: (valueKinds.includes('file') ? 'text' : undefined), value: (/(header|query)/i.test(name) ? [] : '') })}>添加一行</Button>
              </Space>
            )}
          </Form.List>
        )

      case 'json':
        return (
          <Form.Item
            name={name}
            noStyle
            initialValue={param.default || ''}
            rules={[
              ...(rules || []),
              {
                validator: async (_, val) => {
                  if (!visible) return
                  if (!val) return
                  if (typeof val !== 'string') return
                  try { JSON.parse(val) } catch (e) { throw new Error('JSON 格式不合法') }
                }
              }
            ]}
          >
            <TextArea placeholder={placeholder || label || name} rows={6} style={{ fontFamily: 'monospace' }} />
          </Form.Item>
        )

      case 'file':
      case 'directory':
        // 文件/文件夹选择器
        return (
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item name={name} noStyle rules={rules}>
              <Input
                placeholder={placeholder || `选择${type === 'directory' ? '文件夹' : '文件'}`}
                style={{ flex: 1 }}
              />
            </Form.Item>
            <Button icon={<FolderOpenOutlined />} onClick={() => handleFileSelect(name, type)}>
              选择
            </Button>
          </Space.Compact>
        )

      case 'textarea':
        // 多行文本框
        return (
          <Form.Item name={name} noStyle rules={rules}>
            <TextArea
              placeholder={placeholder || label || name}
              rows={4}
              autoSize={{ minRows: 3, maxRows: 8 }}
            />
          </Form.Item>
        )

      case 'number':
        // 数字输入
        return (
          <Form.Item name={name} noStyle rules={rules}>
            <InputNumber
              placeholder={placeholder || label || name}
              style={{ width: '100%' }}
              min={param.min}
              max={param.max}
              step={param.step}
            />
          </Form.Item>
        )

      case 'switch':
      case 'boolean':
        // 开关
        return (
          <Form.Item name={name} noStyle valuePropName="checked">
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
        )

      case 'radio':
        // 单选框组
        return (
          <Form.Item name={name} noStyle rules={rules}>
            <Radio.Group>
              {options.map((opt) => {
                const value = typeof opt === 'string' ? opt : opt.value
                const labelText = typeof opt === 'string' ? opt : opt.label || opt.value
                return (
                  <Radio key={value} value={value}>
                    {labelText}
                  </Radio>
                )
              })}
            </Radio.Group>
          </Form.Item>
        )

      case 'checkbox':
        // 多选框组
        return (
          <Form.Item name={name} noStyle rules={rules}>
            <Checkbox.Group>
              {options.map((opt) => {
                const value = typeof opt === 'string' ? opt : opt.value
                const labelText = typeof opt === 'string' ? opt : opt.label || opt.value
                return (
                  <Checkbox key={value} value={value}>
                    {labelText}
                  </Checkbox>
                )
              })}
            </Checkbox.Group>
          </Form.Item>
        )

      case 'select':
        // 下拉选择
        return (
          <Form.Item name={name} noStyle rules={rules}>
            <Select
              placeholder={placeholder || `请选择${label || name}`}
              allowClear
              showSearch
              optionFilterProp="label"
            >
              {options.map((opt) => {
                const value = typeof opt === 'string' ? opt : opt.value
                const labelText = typeof opt === 'string' ? opt : opt.label || opt.value
                return (
                  <Select.Option key={value} value={value} label={labelText}>
                    {labelText}
                  </Select.Option>
                )
              })}
            </Select>
          </Form.Item>
        )

      case 'multi-select':
        // 多选下拉
        return (
          <Form.Item name={name} noStyle rules={rules}>
            <Select
              mode="multiple"
              placeholder={placeholder || `请选择${label || name}`}
              allowClear
              showSearch
              optionFilterProp="label"
            >
              {options.map((opt) => {
                const value = typeof opt === 'string' ? opt : opt.value
                const labelText = typeof opt === 'string' ? opt : opt.label || opt.value
                return (
                  <Select.Option key={value} value={value} label={labelText}>
                    {labelText}
                  </Select.Option>
                )
              })}
            </Select>
          </Form.Item>
        )

      case 'password':
        // 密码输入
        return (
          <Form.Item name={name} noStyle rules={rules}>
            <Input.Password placeholder={placeholder || label || name} />
          </Form.Item>
        )

      case 'text':
      default:
        // 默认单行文本
        return (
          <Form.Item name={name} noStyle rules={rules}>
            <Input placeholder={placeholder || label || name} />
          </Form.Item>
        )
    }
  }

  const evalVisibleWhen = (expr) => {
    try {
      const values = form.getFieldsValue(true)
      const fn = new Function('values', `return (${expr})`)
      return !!fn(values)
    } catch (_) {
      return true
    }
  }
  const isVisible = (param) => {
    if (param && typeof param.visibleWhen === 'string' && param.visibleWhen.trim()) {
      return evalVisibleWhen(param.visibleWhen)
    }
    return true
  }

  return (
    <Modal
      title={`${shortcut.name} - 参数设置`}
      open
      onOk={handleOk}
      onCancel={onCancel}
      okText="执行"
      cancelText="取消"
      width={520}
    >
      {params.length === 0 && (
        <Space
          direction="vertical"
          style={{ width: '100%', alignItems: 'center', marginBottom: 8 }}
        >
          <Empty
            description={<Text type="secondary">未定义参数（在“参数收集”执行器中添加）</Text>}
          />
        </Space>
      )}
      <Form form={form} layout="vertical">
        {params.map((param) => (
          <Form.Item key={param.name} noStyle shouldUpdate>
            {() => {
              const visible = isVisible(param)
              if (!visible) return null
              return (
                <Form.Item
                  label={param.label || param.name || '未命名参数'}
                  required={!!param.required}
                  tooltip={param.description}
                >
                  {renderFormControl(param, visible)}
                </Form.Item>
              )
            }}
          </Form.Item>
        ))}
        {shortcut.mode !== 'composed' && (
          <Text type="warning">
            <InfoCircleOutlined /> 当前快捷方式未使用新结构
          </Text>
        )}
      </Form>
    </Modal>
  )
}
