import { getInMemoryAccessToken, setInMemoryAccessToken } from './auth';
import type {
  InstitutionSummary,
  StudentBatch,
  StudentRecord,
  ConflictCase,
  AttestationRecord,
  AuditEvent,
  UserRole,
} from './weaveEngine';
import type { DemoAccount } from './syntheticSeed';

const API_BASE_PATH = '/api/v1';

export class ApiClientError extends Error {
  code: string;
  requestId: string;
  status: number;
  details: Array<{ field?: string; reason: string }>;

  constructor(params: {
    code: string;
    message: string;
    requestId: string;
    status: number;
    details?: Array<{ field?: string; reason: string }>;
  }) {
    super(params.message);
    this.name = 'ApiClientError';
    this.code = params.code;
    this.requestId = params.requestId;
    this.status = params.status;
    this.details = params.details || [];
  }
}

async function requestWithRefresh<T>(
  endpoint: string,
  options: RequestInit = {},
  hasRetried = false
): Promise<T> {
  const token = getInMemoryAccessToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_PATH}${endpoint}`, {
    ...options,
    headers,
  });

  // Refresh-once behavior for 401 responses (no infinite loop)
  if (response.status === 401 && !hasRetried && !endpoint.startsWith('/auth/')) {
    const refreshRes = await fetch(`${API_BASE_PATH}/auth/refresh`, {
      method: 'POST',
      credentials: 'same-origin',
    });
    if (refreshRes.ok) {
      const refreshData = await refreshRes.json();
      if (refreshData?.access_token) {
        setInMemoryAccessToken(refreshData.access_token);
        return requestWithRefresh<T>(endpoint, options, true);
      }
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errObj = data?.error || {};
    throw new ApiClientError({
      code: errObj.code || `HTTP_${response.status}`,
      message: errObj.message || `Request failed with status ${response.status}.`,
      requestId: errObj.request_id || 'req_unknown',
      status: response.status,
      details: errObj.details || [],
    });
  }

  return data as T;
}

export const weaveQueryKeys = {
  institutions: (role: UserRole, institutionId?: string) =>
    ['weave', 'institutions', role, institutionId || 'all'] as const,
  validationResults: (role: UserRole, institutionId?: string) =>
    ['weave', 'validation-results', role, institutionId || 'all'] as const,
  batchDetail: (batchId: string) => ['weave', 'batch', batchId] as const,
  conflicts: (role: UserRole, institutionId?: string) =>
    ['weave', 'conflicts', role, institutionId || 'all'] as const,
  attestations: (role: UserRole, institutionId?: string) =>
    ['weave', 'attestations', role, institutionId || 'all'] as const,
  auditEvents: (role: UserRole, institutionId?: string) =>
    ['weave', 'audit-events', role, institutionId || 'all'] as const,
  verifyToken: (token: string) => ['weave', 'verify-token', token] as const,
};

export const weaveApiClient = {
  login: (email: string, password: string) =>
    requestWithRefresh<{
      environment: string;
      access_token: string;
      expires_in: number;
      user: DemoAccount;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getInstitutionsOverview: (role: UserRole, institutionId?: string) =>
    requestWithRefresh<{
      environment: string;
      active_institution_id: string;
      role: UserRole;
      institutions: InstitutionSummary[];
      all_institutions: InstitutionSummary[];
    }>(
      `/institutions/me?role=${encodeURIComponent(role)}&institution_id=${encodeURIComponent(
        institutionId || 'INST-KKR-101'
      )}`
    ),

  getValidationResults: (role: UserRole, institutionId?: string) =>
    requestWithRefresh<{
      environment: string;
      ruleset_version: string;
      batches: StudentBatch[];
      students: StudentRecord[];
    }>(
      `/students/validation-results?role=${encodeURIComponent(
        role
      )}&institution_id=${encodeURIComponent(institutionId || 'INST-KKR-101')}`
    ),

  getBatchDetail: (batchId: string) =>
    requestWithRefresh<{
      environment: string;
      ruleset_version: string;
      batch: StudentBatch;
      records: StudentRecord[];
    }>(`/students/batches/${encodeURIComponent(batchId)}`),

  uploadBatch: (params: {
    institution_id: string;
    filename: string;
    csv_content: string;
    actor_role: UserRole;
    actor_email: string;
  }) =>
    requestWithRefresh<{
      batch: StudentBatch;
      records: StudentRecord[];
      conflicts_created: ConflictCase[];
      audit_event: AuditEvent;
    }>('/students/batches/upload', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  commitBatch: (params: {
    batchId: string;
    actor_role: UserRole;
    actor_email: string;
  }) =>
    requestWithRefresh<{
      environment: string;
      batch: StudentBatch;
      newly_committed: number;
      audit_event: AuditEvent;
    }>(`/students/batches/${encodeURIComponent(params.batchId)}/commit`, {
      method: 'POST',
      body: JSON.stringify({
        actor_role: params.actor_role,
        actor_email: params.actor_email,
      }),
    }),

  getConflicts: (role: UserRole, institutionId?: string) =>
    requestWithRefresh<{
      environment: string;
      conflicts: ConflictCase[];
    }>(
      `/conflicts?role=${encodeURIComponent(role)}&institution_id=${encodeURIComponent(
        institutionId || 'INST-KKR-101'
      )}`
    ),

  resolveConflict: (params: {
    caseId: string;
    resolution_action: string;
    resolution_notes: string;
    actor_role: UserRole;
    actor_email: string;
  }) =>
    requestWithRefresh<{
      conflict: ConflictCase;
      audit_event: AuditEvent;
    }>(`/conflicts/${encodeURIComponent(params.caseId)}/resolve`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getAttestations: (role: UserRole, institutionId?: string) =>
    requestWithRefresh<{
      environment: string;
      attestations: AttestationRecord[];
    }>(
      `/attestations?role=${encodeURIComponent(role)}&institution_id=${encodeURIComponent(
        institutionId || 'INST-KKR-101'
      )}`
    ),

  issueAttestation: (params: {
    student_record_id: string;
    purpose: string;
    validity_days: number;
    actor_role: UserRole;
    actor_email: string;
  }) =>
    requestWithRefresh<{
      attestation: AttestationRecord;
      audit_event: AuditEvent;
    }>('/attestations', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  revokeAttestation: (params: {
    id: string;
    reason: string;
    actor_role: UserRole;
    actor_email: string;
  }) =>
    requestWithRefresh<{
      attestation: AttestationRecord;
      audit_event: AuditEvent;
    }>(`/attestations/${encodeURIComponent(params.id)}/revoke`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  verifyTokenPublic: (token: string) =>
    requestWithRefresh<{
      environment: string;
      disclaimer: string;
      attestation: {
        id: string;
        token: string;
        issuer: string;
        institution_name: string;
        institution_id: string;
        student_ref: string;
        apaar_masked: string;
        program_code: string;
        enrollment_year: number;
        purpose: string;
        consent_id: string;
        issued_at: string;
        expires_at: string;
        status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
        revocation_reason?: string;
        revoked_at?: string;
        ed25519_key_id: string;
        ed25519_signature: string;
      };
      verification: {
        valid: boolean;
        signature_match: boolean;
        not_revoked: boolean;
        not_expired: boolean;
        status_code: string;
        reason: string;
      };
    }>(`/verify/${encodeURIComponent(token)}`),

  getAuditEvents: (role: UserRole, institutionId?: string) =>
    requestWithRefresh<{
      environment: string;
      chain_integrity: {
        intact: boolean;
        checkedCount: number;
        brokenAtEventId?: string;
      };
      events: AuditEvent[];
    }>(
      `/audit-events?role=${encodeURIComponent(role)}&institution_id=${encodeURIComponent(
        institutionId || 'INST-KKR-101'
      )}`
    ),

  queryAssistant: (params: {
    prompt: string;
    role: UserRole;
    institution_id?: string;
  }) =>
    requestWithRefresh<{
      environment: string;
      advisory_only: boolean;
      facts: string[];
      suggestions: string[];
      uncertainty: string;
      sources: Array<{ label: string; route: string }>;
    }>('/assistant/query', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  chatWithAssistant: (params: {
    messages: Array<{ role: 'user' | 'model'; text: string }>;
    model: 'gemini-4-argon' | 'gemini-3.8-flash' | 'gemini-3.1-flash-lite';
    role: UserRole;
    institution_id?: string;
  }) =>
    requestWithRefresh<{
      environment: string;
      advisory_only: boolean;
      model_used: string;
      requested_model: string;
      reply: string;
      sources: Array<{ label: string; route: string }>;
    }>('/assistant/chat', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  transcribeAudio: (params: {
    audioBase64: string;
    mimeType: string;
    samplePromptHint?: string;
  }) =>
    requestWithRefresh<{
      environment: string;
      model: string;
      transcript: string;
    }>('/assistant/transcribe', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
};

