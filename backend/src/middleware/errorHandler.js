// 所有未处理错误最终都会到这里，统一返回 JSON。
export function errorHandler(error, _request, response, _next) {
  console.error(error)
  response.status(error.status || 500).json({
    message: error.status ? error.message : '服务器内部错误。'
  })
}
