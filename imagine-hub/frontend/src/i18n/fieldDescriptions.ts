const descriptions: Record<string, string> = {
  name: "给这个提供商起个名字，方便识别。例如「我的 Grok 接口」「公司 SD 服务器」。",
  base_url: "API 服务器的基础地址，例如 https://api.jiekou.ai。不含路径部分。",
  api_key: "API 认证密钥。如果 cURL 中有 Authorization 头，系统会自动提取。支持 Bearer Token 和 API Key 两种格式。",
  endpoint: "API 接口路径，例如 /v3/async/grok-imagine-image-t2i。完整请求地址 = Base URL + Endpoint。",
  method: "HTTP 请求方法。图片生成通常用 POST，状态查询用 GET。",
  headers: "HTTP 请求头，JSON 格式。默认值：{\"Content-Type\": \"application/json\"}。如果填写了 API Key 且未提供 Authorization 头，系统会自动添加 Bearer 认证。",
  request_template: "请求体模板。使用 {{prompt}} 表示提示词占位、{{model}} 表示模型 ID 占位。生成图片时自动替换为实际值。",
  response_path: "从 API 响应中提取图片的路径。点号分隔，例如 data.0.url 表示 data → 第0项 → url。",
  image_type: "url（默认）：响应返回图片 URL，系统自动下载；base64：响应返回 Base64 编码的图片数据。",
  async_mode: "启用后，提交任务 → 获取 task_id → 轮询等待完成。适用于异步 API，例如 jiekou.ai、各类排队生成服务。",
  task_id_path: "从提交响应中提取任务 ID 的路径。例如 data.task_id。",
  poll_endpoint: "轮询任务状态的接口路径。例如 /v3/async/task-result。留空时系统尝试从 Endpoint 自动推测。",
  poll_method: "轮询请求的 HTTP 方法。GET（推荐）：task_id 作为 URL 查询参数；POST：放在请求体中。",
  poll_field: "传递任务 ID 的参数名。GET 时作为 ?task_id=xxx，POST 时作为请求体字段名。",
  poll_field_position: "query（推荐）：作为 URL 查询参数；path：作为 URL 路径的一部分；body：放在请求体 JSON 中。",
  poll_status_path: "从轮询响应中提取状态的路径。例如 data.status。",
  poll_completed_values: "任务完成的状态值列表，JSON 数组格式。例如 [\"succeeded\", \"completed\"]。",
  poll_failed_values: "任务失败的状态值列表，JSON 数组格式。例如 [\"failed\", \"error\"]。",
  poll_result_path: "任务完成后，从轮询响应中提取图片的路径。例如 data.0.url 或 data.image_url。",
  poll_result_type: "url（默认）：结果为图片 URL；base64：结果为 Base64 编码的图片数据。",
  poll_interval: "每次轮询间隔秒数。系统自动添加 ±20% 随机抖动避免触发限流。建议值 1-5 秒。",
  max_polls: "最大轮询次数。总超时时间 = poll_interval × max_polls。例如 2 秒 × 150 次 = 300 秒（5 分钟）。",
  model_id: "传入 API 的模型标识符，例如 black-forest-labs/FLUX.1-schnell。",
  display_name: "在界面中显示的名称，便于识别。可以设置中文名。",
  default_prompt: "每次生成图片时自动前置的提示词。例如设置「画风：赛博朋克」后，输入「城市夜景」→ 实际发送「画风：赛博朋克，城市夜景」。",
  show_prefix_in_history: "开启后，历史记录中显示完整提示词（含前缀）。关闭后仅显示手动输入的部分。",
  gen_strategy: "单次调用：发送 n 值给 API 期望一次返回多张（适合 Replicate、SD WebUI 等原生支持）。多次调用：循环发送 n=1 多次调用（适合忽略 n 参数的 API，每次调用单独计费）。",
  prompt_transformer: "通过额外的大语言模型（如 DeepSeek、ChatGPT）将中文提示词转化为英文，并根据当前生图模型自动生成负面提示词。需配置 LLM 的 API 地址和密钥。",
};

export function getFieldDescription(key: string): string {
  return descriptions[key] || "";
}
