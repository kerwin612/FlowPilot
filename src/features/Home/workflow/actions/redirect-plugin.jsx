import { useState, useEffect } from 'react'
import { Input, Radio, Space, Form } from 'antd'
import { resolveTemplate } from '../engine/compile'
import { systemService } from '../../../../services'

const { TextArea } = Input

const RedirectPluginConfig = ({ value = {}, onChange }) => {
  const [labelType, setLabelType] = useState(value.labelType || 'single')
  const [labelName, setLabelName] = useState(value.labelName || '')
  const [pluginName, setPluginName] = useState(value.pluginName || '')
  const [featureName, setFeatureName] = useState(value.featureName || '')
  const [payload, setPayload] = useState(value.payload || '')
  const [payloadType, setPayloadType] = useState(value.payloadType || 'text')

  useEffect(() => {
    setLabelType(value.labelType || 'single')
    setLabelName(value.labelName || '')
    setPluginName(value.pluginName || '')
    setFeatureName(value.featureName || '')
    setPayload(value.payload || '')
    setPayloadType(value.payloadType || 'text')
  }, [value])

  const handleChange = (updates) => {
    onChange({
      ...(value || {}),
      labelType,
      labelName,
      pluginName,
      featureName,
      payload,
      payloadType,
      ...updates
    })
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form.Item label="跳转方式" style={{ marginBottom: 8 }}>
        <Radio.Group
          value={labelType}
          onChange={(e) => {
            setLabelType(e.target.value)
            handleChange({ labelType: e.target.value })
          }}
        >
          <Radio value="single">指令名称（自动查找）</Radio>
          <Radio value="precise">插件+指令（精确定位）</Radio>
        </Radio.Group>
      </Form.Item>

      {labelType === 'single' ? (
        <Input
          placeholder="指令名称，例如：翻译"
          value={labelName}
          onChange={(e) => setLabelName(e.target.value)}
          onBlur={() => handleChange({ labelName })}
        />
      ) : (
        <>
          <Input
            placeholder="插件名称，例如：聚合翻译"
            value={pluginName}
            onChange={(e) => setPluginName(e.target.value)}
            onBlur={() => handleChange({ pluginName })}
          />
          <Input
            placeholder="指令名称，例如：翻译"
            value={featureName}
            onChange={(e) => setFeatureName(e.target.value)}
            onBlur={() => handleChange({ featureName })}
          />
        </>
      )}

      <Form.Item label="传递数据类型" style={{ marginBottom: 8 }}>
        <Radio.Group
          value={payloadType}
          onChange={(e) => {
            setPayloadType(e.target.value)
            handleChange({ payloadType: e.target.value })
          }}
        >
          <Radio value="none">无（功能指令）</Radio>
          <Radio value="text">文本</Radio>
          <Radio value="json">JSON 对象</Radio>
        </Radio.Group>
      </Form.Item>

      {payloadType !== 'none' && (
        <TextArea
          placeholder={
            payloadType === 'text'
              ? '传递给目标插件的文本内容，可使用模板变量：{{executor[0].result.value.xxx}}'
              : '传递给目标插件的 JSON 数据，例如：\n{\n  "type": "img",\n  "data": "{{executor[0].result.value.imageBase64}}"\n}\n或\n{\n  "type": "files",\n  "data": "/path/to/file"\n}'
          }
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          onBlur={() => handleChange({ payload })}
          rows={payloadType === 'json' ? 6 : 3}
          style={{ fontFamily: 'monospace' }}
        />
      )}

      <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
        <strong>使用说明：</strong>
        <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
          <li>指令名称方式：uTools 会查找所有拥有该指令的插件，自动打开或让用户选择</li>
          <li>精确定位方式：直接定位到指定插件的指定指令，若未安装会跳转到插件市场</li>
          <li>功能指令：无需传递数据，直接打开插件功能</li>
          <li>匹配指令：必须传递匹配的数据内容（文本或 JSON）</li>
        </ul>
      </div>
    </Space>
  )
}

export const RedirectPluginAction = {
  key: 'redirect-plugin',
  label: '跳转至其他插件',
  getDefaultConfig() {
    return {
      labelType: 'single',
      labelName: '',
      pluginName: '',
      featureName: '',
      payload: '',
      payloadType: 'text'
    }
  },
  ConfigComponent: RedirectPluginConfig,
  async execute(trigger, context, config, options = {}) {
    const { labelType, labelName, pluginName, featureName, payloadType, payload } = config

    // 构建 label 参数
    let label
    if (labelType === 'single') {
      label = resolveTemplate(labelName || '', context).trim()
      if (!label) {
        throw new Error('指令名称不能为空')
      }
    } else {
      const resolvedPluginName = resolveTemplate(pluginName || '', context).trim()
      const resolvedFeatureName = resolveTemplate(featureName || '', context).trim()
      if (!resolvedPluginName || !resolvedFeatureName) {
        throw new Error('插件名称和指令名称都不能为空')
      }
      label = [resolvedPluginName, resolvedFeatureName]
    }

    // 构建 payload 参数
    let resolvedPayload
    if (payloadType === 'none') {
      resolvedPayload = undefined
    } else if (payloadType === 'text') {
      resolvedPayload = resolveTemplate(payload || '', context)
      if (!resolvedPayload || !String(resolvedPayload).trim()) {
        throw new Error('文本内容不能为空')
      }
    } else if (payloadType === 'json') {
      const payloadStr = resolveTemplate(payload || '', context).trim()
      if (!payloadStr) {
        throw new Error('JSON 数据不能为空')
      }
      try {
        resolvedPayload = JSON.parse(payloadStr)
      } catch (e) {
        throw new Error('JSON 数据格式错误: ' + e.message)
      }
    }

    // 执行跳转
    const success = await systemService.redirect(label, resolvedPayload)

    if (!success) {
      throw new Error('跳转失败，请检查插件名称或指令名称是否正确')
    }

    // 显示成功通知
    const targetDesc = Array.isArray(label) ? `${label[0]} - ${label[1]}` : label
    systemService.showNotification(`已跳转至：${targetDesc}`)
  }
}
