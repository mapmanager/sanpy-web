import { TRACE_COLLECTION_VERSION } from '../models/traceCollection'

export const buildInfo = __SANPY_WEB_BUILD_INFO__

export const appInformation: Record<string, string> = {
  App: 'SanPy Web',
  Version: buildInfo.version,
  ...(buildInfo.gitCommit ? { 'Git commit': buildInfo.gitCommit } : {}),
  ...(buildInfo.gitBranch ? { 'Git branch': buildInfo.gitBranch } : {}),
  ...(buildInfo.gitState ? { 'Git state': buildInfo.gitState } : {}),
  'Built (New York)': buildInfo.builtEastern,
  'AcqStore Trace Collection version': TRACE_COLLECTION_VERSION,
}
