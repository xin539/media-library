import { findOperationLogs } from '../repositories/logRepository.js'

export async function listOperationLogs(request, response) {
  response.json({ data: (await findOperationLogs(request.query.limit)) })
}