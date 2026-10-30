import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  VALIDATION_RULES_CATALOG,
  parseStudentCsv,
  validateStudentRow,
  signAttestationPayload,
  verifyAttestationRecord,
  computeAuditEventHash,
  verifyAuditChain,
  createApiError,
  isInstitutionScopedRole,
  type RolePersona,
  type AuditEvent,
  type StudentRecord,
  type ConflictCase,
  type AttestationRecord,
} from './src/lib/weaveEngine';
import {
  createInitialWeaveState,
  SYNTHETIC_DEMO_ACCOUNTS,
} from './src/lib/syntheticSeed';
import {
  matchKnowledgeIntent,
  WEAVE_KNOWLEDGE_BASE,
} from './src/data/weaveKnowledgeBase';

const PORT = 3000;
const state = createInitialWeaveState();

function appendAuditEvent(params: {
  institution_id: string;
  actor_role: RolePersona;
  actor_user_id: string;
  action: string;
  entity_type: AuditEvent['entity_type'];
  entity_id: string;
  outcome?: AuditEvent['outcome'];
  summary: string;
}): AuditEvent {
  const latest = state.auditEvents[0];
  const previous_hash = latest ? latest.event_hash : 'GENESIS_00000000000000000000000000000000';
  const id = `AUD-2026-${String(state.auditEvents.length + 1).padStart(4, '0')}`;
  const created_at = new Date().toISOString();
  const base: Omit<AuditEvent, 'event_hash'> = {
    id,
    institution_id: params.institution_id,
    actor_role: params.actor_role,
    actor_user_id: params.actor_user_id,
    action: params.action,
    entity_type: params.entity_type,
    entity_id: params.entity_id,
    outcome: params.outcome || 'SUCCESS',
    summary: params.summary,
    previous_hash,
    created_at,
  };
  const event_hash = computeAuditEventHash(base);
  const fullEvent: AuditEvent = { ...base, event_hash };
  state.auditEvents.unshift(fullEvent);
  return fullEvent;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Health Check
  app.get('/api/v1/health', (_req, res) => {
    res.json({
      status: 'ok',
      environment: 'SYNTHETIC',
      contract_version: '0.1.0',
      service: 'weave-modular-monolith',
    });
  });

  // Synthetic Auth Login (Supports Administration Login & Student Login via Unique ID Code + Password)
  app.post('/api/v1/auth/login', (req, res) => {
    const reqId = `req_${Date.now().toString(36)}`;
    const { uniqueId = '', email = '', password = '', loginType = 'administration' } = req.body || {};
    const identifier = String(uniqueId || email).trim();

    if (!identifier || !password || String(password).length < 4) {
      res.status(400).json(
        createApiError(
          'INVALID_CREDENTIALS',
          'Provide a valid Unique ID Code and password.',
          reqId,
          [{ field: 'uniqueId', reason: 'Unique ID Code and password are required.' }]
        )
      );
      return;
    }

    if (loginType === 'student') {
      const upperId = identifier.toUpperCase();
      const matchedStudent =
        state.students.find(
          (s) => s.student_ref.toUpperCase() === upperId || s.id.toUpperCase() === upperId
        ) || state.students[0];
      const studentAccount = {
        id: `usr_stu_${matchedStudent.student_ref.toLowerCase()}`,
        email: `${matchedStudent.student_ref.toLowerCase()}@student.eduverify.synth.edu`,
        name: matchedStudent.full_name,
        role: 'student' as RolePersona,
        portalType: 'student' as const,
        student_ref: matchedStudent.student_ref,
        roleLabel: `Student · ${matchedStudent.student_ref}`,
        institution_id: matchedStudent.institution_id,
        institution_name: matchedStudent.institution_name,
        scopeDescription: `My EduVerify Student Portal · ${matchedStudent.student_ref} (${matchedStudent.apaar_masked})`,
      };

      res.json({
        environment: 'SYNTHETIC',
        access_token: `synth_mem_tok_student_${Date.now().toString(36)}`,
        expires_in: 3600,
        user: studentAccount,
      });
      return;
    }

    const lowerId = identifier.toLowerCase();
    const adminCandidates = SYNTHETIC_DEMO_ACCOUNTS.filter((a) => a.role !== 'student');
    const account =
      adminCandidates.find(
        (a) =>
          a.email.toLowerCase() === lowerId ||
          a.id.toLowerCase() === lowerId ||
          (a.institution_id && a.institution_id.toLowerCase() === lowerId)
      ) || {
        ...adminCandidates[0],
        portalType: 'admin' as const,
        roleLabel: `AICTE Admin Console · ${identifier.toUpperCase()}`,
      };

    res.json({
      environment: 'SYNTHETIC',
      access_token: `synth_mem_tok_${account.role}_${Date.now().toString(36)}`,
      expires_in: 3600,
      user: {
        ...account,
        portalType: 'admin',
      },
    });
  });

  app.post('/api/v1/auth/refresh', (_req, res) => {
    res.json({
      environment: 'SYNTHETIC',
      access_token: `synth_mem_tok_refreshed_${Date.now().toString(36)}`,
      expires_in: 3600,
    });
  });

  // Student Portal — Scoped Student Profile, Academic Records, Verification, Discrepancies & Consent
  app.get('/api/v1/student/me', (req, res) => {
    const studentRef = String(req.query.student_ref || 'STU-2026-101').toUpperCase();
    const student =
      state.students.find(
        (s) => s.student_ref.toUpperCase() === studentRef || s.id.toUpperCase() === studentRef
      ) || state.students[0];

    const institution =
      state.institutions.find((i) => i.id === student.institution_id) || state.institutions[0];

    const courseRecords =
      state.studentCourseRecords[student.student_ref] ||
      state.studentCourseRecords['STU-2026-101'] ||
      [];

    const attestations = state.attestations.filter(
      (a) => a.student_ref.toUpperCase() === student.student_ref.toUpperCase()
    );

    const verificationRequests = state.verificationRequests.filter(
      (v) => v.student_ref.toUpperCase() === student.student_ref.toUpperCase()
    );

    const discrepancies = state.discrepancies.filter(
      (d) => d.student_ref.toUpperCase() === student.student_ref.toUpperCase()
    );

    const consent = state.studentConsents[student.student_ref] || {
      ...state.studentConsents['STU-2026-101'],
      student_ref: student.student_ref,
    };

    const activityHistory = state.auditEvents.filter(
      (ev) =>
        ev.summary.includes(student.student_ref) ||
        ev.summary.includes(student.apaar_masked) ||
        ev.entity_id === student.id ||
        ev.entity_id === student.batch_id ||
        attestations.some((a) => a.id === ev.entity_id)
    );

    res.json({
      environment: 'SYNTHETIC',
      student: {
        ...student,
        university: institution.university || 'NIT Kurukshetra (Autonomous)',
        course_name:
          student.program_code === 'BTECH-CSE'
            ? 'Bachelor of Technology (B.Tech)'
            : student.program_code === 'BTECH-ECE'
              ? 'Bachelor of Technology (B.Tech)'
              : student.program_code === 'MTECH-AI'
                ? 'Master of Technology (M.Tech)'
                : 'AICTE Approved Degree Programme',
        branch:
          student.program_code === 'BTECH-CSE'
            ? 'Computer Science & Engineering'
            : student.program_code === 'BTECH-ECE'
              ? 'Electronics & Communication Engineering'
              : student.program_code === 'MTECH-AI'
                ? 'Artificial Intelligence & Data Science'
                : student.program_code,
        current_academic_year: '2nd Year · Semester III (AY 2026–27)',
        email: `${student.student_ref.toLowerCase()}@student.nitkkr.synth.edu`,
        phone_masked: '+91 ••••• •4829',
      },
      institution,
      course_records: courseRecords,
      attestations,
      verification_requests: verificationRequests,
      discrepancies,
      consent,
      activity_history: activityHistory,
    });
  });

  // Student Portal — Submit a Discrepancy Report
  app.post('/api/v1/student/discrepancies', (req, res) => {
    const reqId = `req_${Date.now().toString(36)}`;
    const {
      student_ref = 'STU-2026-101',
      discrepancy_type = 'Semester Record Discrepancy',
      description = '',
      relevant_record = '',
      supporting_doc_ref = '',
    } = req.body || {};

    if (!description || String(description).trim().length < 10) {
      res.status(400).json(
        createApiError(
          'VALIDATION_ERROR',
          'Please provide a clear discrepancy description (at least 10 characters).',
          reqId,
          [{ field: 'description', reason: 'Minimum 10 characters required.' }]
        )
      );
      return;
    }

    const student =
      state.students.find((s) => s.student_ref.toUpperCase() === String(student_ref).toUpperCase()) ||
      state.students[0];

    const nowIso = new Date().toISOString();
    const newTicket = {
      id: `DSC-2026-${String(state.discrepancies.length + 55).padStart(3, '0')}`,
      student_ref: student.student_ref,
      student_name: student.full_name,
      institution_id: student.institution_id,
      institution_name: student.institution_name,
      discrepancy_type,
      description: String(description).trim(),
      relevant_record: String(relevant_record || 'General Academic Record').trim(),
      supporting_doc_ref: String(supporting_doc_ref || 'DOC-REF-PENDING').trim(),
      status: 'Submitted' as const,
      created_at: nowIso,
      updated_at: nowIso,
      reviewer_notes: 'Queued for review by Institutional Nodal Officer.',
    };

    state.discrepancies.unshift(newTicket);

    const auditEvent = appendAuditEvent({
      institution_id: student.institution_id,
      actor_role: 'student',
      actor_user_id: `${student.student_ref.toLowerCase()}@student.eduverify.synth.edu`,
      action: 'DISCREPANCY_SUBMITTED',
      entity_type: 'STUDENT_RECORD',
      entity_id: newTicket.id,
      outcome: 'SUCCESS',
      summary: `Student ${student.student_ref} submitted discrepancy report ${newTicket.id} (${discrepancy_type}).`,
    });

    res.status(201).json({
      environment: 'SYNTHETIC',
      ticket: newTicket,
      audit_event: auditEvent,
    });
  });

  // Student Portal — Update Consent & Privacy Preferences
  app.post('/api/v1/student/consent', (req, res) => {
    const {
      student_ref = 'STU-2026-101',
      scholarship_portals_enabled = true,
      credit_transfer_abc_enabled = true,
      employer_verification_enabled = false,
    } = req.body || {};

    const student =
      state.students.find((s) => s.student_ref.toUpperCase() === String(student_ref).toUpperCase()) ||
      state.students[0];

    const existing = state.studentConsents[student.student_ref] || {
      ...state.studentConsents['STU-2026-101'],
      student_ref: student.student_ref,
    };

    const nowIso = new Date().toISOString();
    const updatedConsent = {
      ...existing,
      scholarship_portals_enabled: Boolean(scholarship_portals_enabled),
      credit_transfer_abc_enabled: Boolean(credit_transfer_abc_enabled),
      employer_verification_enabled: Boolean(employer_verification_enabled),
      statutory_aicte_reporting_enabled: true, // Statutory AICTE intake reporting cannot be disabled
      updated_at: nowIso,
      consent_history: [
        {
          id: `CNS-HIST-${Date.now().toString(36).toUpperCase()}`,
          action: 'PREFERENCE_UPDATED',
          scope: `Scholarship=${Boolean(scholarship_portals_enabled)}, ABC=${Boolean(
            credit_transfer_abc_enabled
          )}, Employer=${Boolean(employer_verification_enabled)}`,
          timestamp: nowIso,
          actor: `${student.full_name} (${student.student_ref})`,
        },
        ...existing.consent_history,
      ],
    };

    state.studentConsents[student.student_ref] = updatedConsent;
    student.consent_granted =
      updatedConsent.scholarship_portals_enabled || updatedConsent.credit_transfer_abc_enabled;

    const auditEvent = appendAuditEvent({
      institution_id: student.institution_id,
      actor_role: 'student',
      actor_user_id: `${student.student_ref.toLowerCase()}@student.eduverify.synth.edu`,
      action: 'CONSENT_PREFERENCES_UPDATED',
      entity_type: 'STUDENT_RECORD',
      entity_id: student.id,
      outcome: 'SUCCESS',
      summary: `Student ${student.student_ref} updated data-sharing consent preferences (Scholarship=${updatedConsent.scholarship_portals_enabled}, ABC=${updatedConsent.credit_transfer_abc_enabled}, Employer=${updatedConsent.employer_verification_enabled}).`,
    });

    res.json({
      environment: 'SYNTHETIC',
      consent: updatedConsent,
      audit_event: auditEvent,
    });
  });

  // Admin Portal — Verification Requests & Student Discrepancies Management
  app.get('/api/v1/admin/verification-requests', (_req, res) => {
    res.json({
      environment: 'SYNTHETIC',
      verification_requests: state.verificationRequests,
      discrepancies: state.discrepancies,
    });
  });

  app.post('/api/v1/admin/verification-requests/:id/decision', (req, res) => {
    const reqId = `req_${Date.now().toString(36)}`;
    const { id } = req.params;
    const {
      status = 'Verified',
      actor_role = 'regulator_admin',
      actor_email = 'director.compliance@aicte.synth.gov.in',
      notes = '',
    } = req.body || {};

    const found = state.verificationRequests.find((v) => v.id.toUpperCase() === id.toUpperCase());
    if (!found) {
      res.status(404).json(createApiError('NOT_FOUND', `Verification request ${id} not found.`, reqId));
      return;
    }

    const prevStatus = found.status;
    found.status = status;
    found.reviewed_by = actor_email;
    found.reviewed_at = new Date().toISOString();
    if (notes) {
      found.evidence_source = `${found.evidence_source} · Note: ${String(notes).trim()}`;
    }

    const auditEvent = appendAuditEvent({
      institution_id: found.institution_id,
      actor_role: actor_role as RolePersona,
      actor_user_id: actor_email,
      action: 'VERIFICATION_REQUEST_DECISION',
      entity_type: 'ATTESTATION',
      entity_id: found.id,
      outcome: status === 'Unable to Verify' ? 'DENIED' : 'SUCCESS',
      summary: `Updated verification request ${found.id} (${found.student_ref} · ${found.requesting_organisation}) from ${prevStatus} to ${status}.`,
    });

    res.json({
      environment: 'SYNTHETIC',
      verification_request: found,
      audit_event: auditEvent,
    });
  });

  app.post('/api/v1/admin/discrepancies/:id/status', (req, res) => {
    const reqId = `req_${Date.now().toString(36)}`;
    const { id } = req.params;
    const {
      status = 'Resolved',
      reviewer_notes = '',
      actor_role = 'regulator_admin',
      actor_email = 'director.compliance@aicte.synth.gov.in',
    } = req.body || {};

    const ticket = state.discrepancies.find((d) => d.id.toUpperCase() === id.toUpperCase());
    if (!ticket) {
      res.status(404).json(createApiError('NOT_FOUND', `Discrepancy ticket ${id} not found.`, reqId));
      return;
    }

    ticket.status = status;
    ticket.updated_at = new Date().toISOString();
    if (reviewer_notes) {
      ticket.reviewer_notes = String(reviewer_notes).trim();
    }

    const auditEvent = appendAuditEvent({
      institution_id: ticket.institution_id,
      actor_role: actor_role as RolePersona,
      actor_user_id: actor_email,
      action: 'DISCREPANCY_REVIEWED',
      entity_type: 'STUDENT_RECORD',
      entity_id: ticket.id,
      outcome: 'SUCCESS',
      summary: `Admin updated discrepancy ${ticket.id} (${ticket.student_ref}) to '${status}'.`,
    });

    res.json({
      environment: 'SYNTHETIC',
      ticket,
      audit_event: auditEvent,
    });
  });

  // Validation Rules Catalog
  app.get('/api/v1/rules', (_req, res) => {
    res.json({
      environment: 'SYNTHETIC',
      ruleset_version: '2026.10.v1',
      rules: VALIDATION_RULES_CATALOG,
    });
  });

  // Institutions & Intake Overview
  app.get('/api/v1/institutions/me', (req, res) => {
    const institutionId = (req.query.institution_id as string) || 'INST-KKR-101';
    const role = ((req.query.role as string) || 'institution_operator') as RolePersona;

    const visibleInstitutions = isInstitutionScopedRole(role)
      ? state.institutions.filter((i) => i.id === institutionId)
      : state.institutions;

    res.json({
      environment: 'SYNTHETIC',
      active_institution_id: institutionId,
      role,
      institutions: visibleInstitutions,
      all_institutions: state.institutions,
    });
  });

  // Student Batches & Masked Validation Records
  app.get('/api/v1/students/validation-results', (req, res) => {
    const institutionId = req.query.institution_id as string | undefined;
    const role = ((req.query.role as string) || 'institution_operator') as RolePersona;

    const scopedStudents =
      isInstitutionScopedRole(role) && institutionId
        ? state.students.filter((s) => s.institution_id === institutionId)
        : state.students;

    const scopedBatches =
      isInstitutionScopedRole(role) && institutionId
        ? state.batches.filter((b) => b.institution_id === institutionId)
        : state.batches;

    res.json({
      environment: 'SYNTHETIC',
      ruleset_version: '2026.10.v1',
      batches: scopedBatches,
      students: scopedStudents,
    });
  });

  // Single Batch Detail + Validation Results
  app.get('/api/v1/students/batches/:batchId', (req, res) => {
    const reqId = `req_${Date.now().toString(36)}`;
    const { batchId } = req.params;
    const batch = state.batches.find((b) => b.id.toUpperCase() === batchId.toUpperCase());
    if (!batch) {
      res.status(404).json(createApiError('BATCH_NOT_FOUND', `Batch ${batchId} not found.`, reqId));
      return;
    }
    const records = state.students.filter((s) => s.batch_id === batch.id);
    res.json({
      environment: 'SYNTHETIC',
      ruleset_version: batch.ruleset_version || '2026.10.v1',
      batch,
      records,
    });
  });

  // Commit Eligible Rows of a Batch
  app.post('/api/v1/students/batches/:batchId/commit', (req, res) => {
    const reqId = `req_${Date.now().toString(36)}`;
    const { batchId } = req.params;
    const { actor_role = 'institution_admin', actor_email = 'dean.academic@nitkkr.synth.edu' } =
      req.body || {};

    const batch = state.batches.find((b) => b.id.toUpperCase() === batchId.toUpperCase());
    if (!batch) {
      res.status(404).json(createApiError('BATCH_NOT_FOUND', `Batch ${batchId} not found.`, reqId));
      return;
    }

    if (actor_role === 'auditor') {
      res.status(403).json(
        createApiError('FORBIDDEN', 'Auditors have read-only access and cannot commit batches.', reqId)
      );
      return;
    }

    let newlyCommitted = 0;
    for (const s of state.students) {
      if (s.batch_id === batch.id && s.status === 'VERIFIED' && !s.committed) {
        s.committed = true;
        newlyCommitted++;
      }
    }
    batch.committed = true;
    batch.committed_rows = state.students.filter(
      (s) => s.batch_id === batch.id && s.committed
    ).length;

    const auditEvent = appendAuditEvent({
      institution_id: batch.institution_id,
      actor_role: actor_role as RolePersona,
      actor_user_id: actor_email,
      action: 'BATCH_COMMITTED',
      entity_type: 'BATCH',
      entity_id: batch.id,
      outcome: 'SUCCESS',
      summary: `Committed ${batch.committed_rows} eligible verified records from batch ${batch.id} (${newlyCommitted} newly committed).`,
    });

    res.json({
      environment: 'SYNTHETIC',
      batch,
      newly_committed: newlyCommitted,
      audit_event: auditEvent,
    });
  });

  // Upload & Validate CSV Batch
  app.post('/api/v1/students/batches/upload', (req, res) => {
    const reqId = `req_${Date.now().toString(36)}`;
    const {
      institution_id = 'INST-KKR-101',
      filename = 'manual_upload_batch.csv',
      csv_content = '',
      actor_role = 'institution_operator',
      actor_email = 'sarthak.operator@nitkkr.synth.edu',
    } = req.body || {};

    if (actor_role === 'auditor') {
      res.status(403).json(
        createApiError('FORBIDDEN', 'Auditor role is read-only and cannot upload batches.', reqId)
      );
      return;
    }

    if (!csv_content || typeof csv_content !== 'string' || !csv_content.trim()) {
      res.status(400).json(
        createApiError('VALIDATION_ERROR', 'CSV content cannot be empty.', reqId, [
          { field: 'csv_content', reason: 'Provide non-empty synthetic CSV rows.' },
        ])
      );
      return;
    }

    const inst = state.institutions.find((i) => i.id === institution_id) || state.institutions[0];
    const parsed = parseStudentCsv(csv_content);

    if (parsed.parseErrors.length > 0 && parsed.rows.length === 0) {
      res.status(400).json(
        createApiError(
          'CSV_POLICY_OR_FORMAT_ERROR',
          parsed.parseErrors[0].reason,
          reqId,
          parsed.parseErrors.map((e) => ({ field: `line_${e.line}`, reason: e.reason }))
        )
      );
      return;
    }

    const existingHashes = new Map<
      string,
      { institution_id: string; institution_name: string; program_code: string }
    >();
    for (const s of state.students) {
      if (!s.apaar_hash.startsWith('invalid:')) {
        existingHashes.set(s.apaar_hash, {
          institution_id: s.institution_id,
          institution_name: s.institution_name,
          program_code: s.program_code,
        });
      }
    }

    const programCounts: Record<string, { enrolled: number; cap: number }> = {};
    for (const p of inst.programs) {
      programCounts[p.program_code] = {
        enrolled: p.enrolled_verified,
        cap: p.approved_intake,
      };
    }

    const batchId = `BAT-2026-${String(state.batches.length + 1).padStart(3, '0')}`;
    const createdAt = new Date().toISOString();
    let passedRows = 0;
    let flaggedRows = 0;
    let failedRows = 0;
    const newRecords: StudentRecord[] = [];
    const newConflicts: ConflictCase[] = [];

    for (let idx = 0; idx < parsed.rows.length; idx++) {
      const row = parsed.rows[idx];
      const evaluation = validateStudentRow(row, {
        institution_id: inst.id,
        institution_name: inst.name,
        existing_hashes: existingHashes,
        program_counts: programCounts,
      });

      const recId = `REC-2026-${String(state.students.length + idx + 101)}`;
      const record: StudentRecord = {
        id: recId,
        institution_id: inst.id,
        institution_name: inst.name,
        student_ref: row.student_ref,
        apaar_masked: evaluation.apaarMasked,
        apaar_hash: evaluation.apaarHash,
        full_name: row.full_name,
        dob: row.dob,
        program_code: row.program_code,
        enrollment_year: row.enrollment_year,
        consent_granted: row.consent_granted,
        status: evaluation.overallStatus,
        committed: false,
        validation_results: evaluation.outcomes,
        batch_id: batchId,
        created_at: createdAt,
      };

      newRecords.push(record);

      if (evaluation.overallStatus === 'VERIFIED') {
        passedRows++;
        existingHashes.set(evaluation.apaarHash, {
          institution_id: inst.id,
          institution_name: inst.name,
          program_code: row.program_code,
        });
        const progSlice = inst.programs.find((p) => p.program_code === row.program_code);
        if (progSlice) {
          progSlice.enrolled_verified += 1;
        }
        if (programCounts[row.program_code]) {
          programCounts[row.program_code].enrolled += 1;
        }
      } else if (evaluation.overallStatus === 'VALIDATION_FAILED') {
        failedRows++;
      } else {
        flaggedRows++;
        const progSlice = inst.programs.find((p) => p.program_code === row.program_code);
        if (progSlice) {
          progSlice.flagged_or_pending += 1;
        }
      }

      if (evaluation.conflict) {
        const conflictCase: ConflictCase = {
          id: `CNF-2026-${String(state.conflicts.length + newConflicts.length + 20).padStart(3, '0')}`,
          apaar_masked: evaluation.apaarMasked,
          apaar_hash: evaluation.apaarHash,
          student_name: row.full_name,
          primary_institution_id: inst.id,
          primary_institution_name: inst.name,
          primary_program_code: row.program_code,
          competing_institution_id: evaluation.conflict.competing_institution_id,
          competing_institution_name: evaluation.conflict.competing_institution_name,
          competing_program_code: evaluation.conflict.competing_program_code,
          enrollment_year: row.enrollment_year,
          academic_year_overlap: `AY ${row.enrollment_year}–${String(row.enrollment_year + 1).slice(-2)} Overlap`,
          conflict_type: evaluation.conflict.conflict_type,
          match_evidence: [
            `Identical salted SHA-256 APAAR digest (${evaluation.apaarMasked})`,
            `Concurrent active enrollment submission in ${row.program_code}`,
          ],
          similarity_score: 0.99,
          severity: 'HIGH',
          status: 'OPEN',
          assigned_reviewer: 'satyam.officer@aicte.synth.gov.in',
          decision_history: [
            {
              id: `DEC-${Date.now()}`,
              action: 'CANDIDATE_QUEUED',
              actor_email: 'system.validation@weave.synth',
              actor_role: 'system',
              notes: `Flagged during batch ${batchId} ingestion.`,
              timestamp: createdAt,
            },
          ],
          detected_at: createdAt,
        };
        newConflicts.push(conflictCase);
      }
    }

    const batchStatus =
      failedRows === parsed.rows.length
        ? 'FAILED'
        : flaggedRows > 0 || failedRows > 0
          ? 'COMPLETED_WITH_FLAGS'
          : 'COMPLETED';

    const newBatch = {
      id: batchId,
      institution_id: inst.id,
      institution_name: inst.name,
      filename,
      uploaded_by: actor_email,
      total_rows: parsed.rows.length,
      passed_rows: passedRows,
      flagged_rows: flaggedRows,
      failed_rows: failedRows,
      committed_rows: 0,
      ruleset_version: '2026.10.v1',
      commit_eligible: passedRows > 0,
      committed: false,
      status: batchStatus as 'COMPLETED' | 'COMPLETED_WITH_FLAGS' | 'FAILED',
      created_at: createdAt,
    };

    state.batches.unshift(newBatch);
    state.students.unshift(...newRecords);
    state.conflicts.unshift(...newConflicts);

    const auditEvent = appendAuditEvent({
      institution_id: inst.id,
      actor_role: actor_role as RolePersona,
      actor_user_id: actor_email,
      action: 'BATCH_INGESTED',
      entity_type: 'BATCH',
      entity_id: batchId,
      outcome: failedRows > 0 || flaggedRows > 0 ? 'FLAGGED' : 'SUCCESS',
      summary: `Ingested ${filename}: ${passedRows} verified, ${flaggedRows} flagged (${newConflicts.length} conflicts), ${failedRows} failed.`,
    });

    res.status(201).json({
      batch: newBatch,
      records: newRecords,
      conflicts_created: newConflicts,
      audit_event: auditEvent,
    });
  });

  // Conflicts List (Redacts counterpart institution identity for institution-scoped users)
  app.get('/api/v1/conflicts', (req, res) => {
    const institutionId = req.query.institution_id as string | undefined;
    const role = ((req.query.role as string) || 'institution_operator') as RolePersona;
    const instScoped = isInstitutionScopedRole(role);

    const filtered =
      instScoped && institutionId
        ? state.conflicts.filter(
            (c) =>
              c.primary_institution_id === institutionId ||
              c.competing_institution_id === institutionId
          )
        : state.conflicts;

    const visibleConflicts = filtered.map((c) => {
      if (!instScoped) return c;
      // Hide counterpart institution identity from institution-level users per Section 11
      const isPrimaryOwn = c.primary_institution_id === institutionId;
      return {
        ...c,
        primary_institution_name: isPrimaryOwn
          ? c.primary_institution_name
          : 'Redacted Counterpart Institution (Regulator Scope Only)',
        primary_institution_id: isPrimaryOwn ? c.primary_institution_id : 'INST-REDACTED',
        competing_institution_name: !isPrimaryOwn
          ? c.competing_institution_name
          : 'Redacted Counterpart Institution (Regulator Scope Only)',
        competing_institution_id: !isPrimaryOwn ? c.competing_institution_id : 'INST-REDACTED',
      };
    });

    res.json({
      environment: 'SYNTHETIC',
      conflicts: visibleConflicts,
    });
  });

  // Resolve Conflict Case
  app.post('/api/v1/conflicts/:caseId/resolve', (req, res) => {
    const reqId = `req_${Date.now().toString(36)}`;
    const { caseId } = req.params;
    const {
      resolution_action,
      resolution_notes,
      actor_role = 'regulator_officer',
      actor_email = 'satyam.officer@aicte.synth.gov.in',
    } = req.body || {};

    if (isInstitutionScopedRole(actor_role as RolePersona) || actor_role === 'auditor') {
      res.status(403).json(
        createApiError(
          'FORBIDDEN_ROLE',
          'Only regulator_officer or regulator_admin roles may adjudicate cross-institution conflict candidates.',
          reqId
        )
      );
      return;
    }

    const conflict = state.conflicts.find((c) => c.id === caseId);
    if (!conflict) {
      res.status(404).json(
        createApiError('NOT_FOUND', `Conflict case ${caseId} not found.`, reqId)
      );
      return;
    }

    if (!resolution_action || !resolution_notes || String(resolution_notes).trim().length < 8) {
      res.status(400).json(
        createApiError(
          'VALIDATION_ERROR',
          'Resolution requires both an action and an audit rationale (min 8 chars).',
          reqId,
          [{ field: 'resolution_notes', reason: 'Minimum 8 characters required for audit trail.' }]
        )
      );
      return;
    }

    const nowIso = new Date().toISOString();
    conflict.status =
      resolution_action === 'REQUEST_INFO'
        ? 'INFO_REQUESTED'
        : resolution_action === 'ESCALATE_REGULATOR'
          ? 'ESCALATED'
          : 'RESOLVED';
    conflict.resolution_action = resolution_action;
    conflict.resolution_notes = String(resolution_notes).trim();
    conflict.resolved_by = actor_email;
    conflict.resolved_at = nowIso;
    conflict.decision_history = [
      ...(conflict.decision_history || []),
      {
        id: `DEC-${Date.now().toString(36)}`,
        action: resolution_action,
        actor_email,
        actor_role: String(actor_role),
        notes: conflict.resolution_notes,
        timestamp: nowIso,
      },
    ];

    for (const stu of state.students) {
      if (stu.apaar_hash === conflict.apaar_hash && stu.status === 'FLAGGED_CONFLICT') {
        if (resolution_action === 'CONFIRM_TRANSFER' || resolution_action === 'NOT_A_DUPLICATE') {
          stu.status = 'VERIFIED';
        } else if (
          resolution_action === 'REJECT_DUPLICATE' ||
          resolution_action === 'CONFIRM_DUPLICATE'
        ) {
          stu.status = 'VALIDATION_FAILED';
        }
      }
    }

    const auditEvent = appendAuditEvent({
      institution_id: conflict.primary_institution_id,
      actor_role: actor_role as RolePersona,
      actor_user_id: actor_email,
      action: 'CONFLICT_RESOLVED',
      entity_type: 'CONFLICT_CASE',
      entity_id: conflict.id,
      outcome: 'SUCCESS',
      summary: `Adjudicated ${conflict.id} (${conflict.apaar_masked}) with ${resolution_action}: ${conflict.resolution_notes}`,
    });

    res.json({
      conflict,
      audit_event: auditEvent,
    });
  });

  // Attestations List
  app.get('/api/v1/attestations', (req, res) => {
    const institutionId = req.query.institution_id as string | undefined;
    const role = ((req.query.role as string) || 'institution_operator') as RolePersona;

    const list =
      isInstitutionScopedRole(role) && institutionId
        ? state.attestations.filter((a) => a.institution_id === institutionId)
        : state.attestations;

    res.json({
      environment: 'SYNTHETIC',
      attestations: list,
    });
  });

  // Issue New Ed25519 Attestation
  app.post('/api/v1/attestations', (req, res) => {
    const reqId = `req_${Date.now().toString(36)}`;
    const {
      student_record_id,
      purpose = 'AICTE Verified Enrolment Attestation',
      validity_days = 365,
      actor_role = 'institution_admin',
      actor_email = 'dean.academic@nitkkr.synth.edu',
    } = req.body || {};

    const student = state.students.find((s) => s.id === student_record_id);
    if (!student) {
      res.status(404).json(
        createApiError('STUDENT_NOT_FOUND', 'Selected student record does not exist.', reqId)
      );
      return;
    }

    if (!student.consent_granted) {
      res.status(400).json(
        createApiError(
          'CONSENT_REQUIRED',
          'Cannot issue attestation without active student consent (RULE-CONSENT-CHK).',
          reqId,
          [{ field: 'student_record_id', reason: 'consent_granted is false on student record.' }]
        )
      );
      return;
    }

    if (student.status !== 'VERIFIED') {
      res.status(400).json(
        createApiError(
          'RECORD_NOT_VERIFIED',
          `Student record must be VERIFIED before attestation issuance (current: ${student.status}).`,
          reqId
        )
      );
      return;
    }

    const attId = `ATT-2026-${String(state.attestations.length + 905)}`;
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() + Number(validity_days || 365) * 86400 * 1000
    ).toISOString();

    const signed = signAttestationPayload({
      attestation_id: attId,
      student_ref: student.student_ref,
      apaar_hash: student.apaar_hash,
      institution_id: student.institution_id,
      program_code: student.program_code,
      enrollment_year: student.enrollment_year,
      issued_at: issuedAt,
      expires_at: expiresAt,
    });

    const newAttestation: AttestationRecord = {
      id: attId,
      token: attId.toLowerCase(),
      student_record_id: student.id,
      student_ref: student.student_ref,
      student_name: student.full_name,
      apaar_masked: student.apaar_masked,
      apaar_hash: student.apaar_hash,
      institution_id: student.institution_id,
      institution_name: student.institution_name,
      program_code: student.program_code,
      enrollment_year: student.enrollment_year,
      consent_id: `CNS-2026-${String(Math.floor(4500 + state.attestations.length))}`,
      purpose: String(purpose).trim(),
      issued_at: issuedAt,
      expires_at: expiresAt,
      status: 'ACTIVE',
      ed25519_key_id: signed.key_id,
      ed25519_signature: signed.signature,
      verification_payload: signed.verification_payload,
    };

    state.attestations.unshift(newAttestation);

    const auditEvent = appendAuditEvent({
      institution_id: student.institution_id,
      actor_role: actor_role as RolePersona,
      actor_user_id: actor_email,
      action: 'ATTESTATION_ISSUED',
      entity_type: 'ATTESTATION',
      entity_id: attId,
      outcome: 'SUCCESS',
      summary: `Issued Ed25519 attestation ${attId} for ${student.student_ref} (${student.apaar_masked}).`,
    });

    res.status(201).json({
      attestation: newAttestation,
      audit_event: auditEvent,
    });
  });

  // Revoke Attestation
  app.post('/api/v1/attestations/:id/revoke', (req, res) => {
    const reqId = `req_${Date.now().toString(36)}`;
    const { id } = req.params;
    const {
      reason,
      actor_role = 'institution_admin',
      actor_email = 'dean.academic@nitkkr.synth.edu',
    } = req.body || {};

    const att = state.attestations.find((a) => a.id.toUpperCase() === id.toUpperCase());
    if (!att) {
      res.status(404).json(createApiError('NOT_FOUND', `Attestation ${id} not found.`, reqId));
      return;
    }

    if (!reason || String(reason).trim().length < 5) {
      res.status(400).json(
        createApiError('VALIDATION_ERROR', 'Revocation reason is required (min 5 chars).', reqId, [
          { field: 'reason', reason: 'Provide explicit revocation rationale.' },
        ])
      );
      return;
    }

    att.status = 'REVOKED';
    att.revocation_reason = String(reason).trim();
    att.revoked_at = new Date().toISOString();

    const auditEvent = appendAuditEvent({
      institution_id: att.institution_id,
      actor_role: actor_role as RolePersona,
      actor_user_id: actor_email,
      action: 'ATTESTATION_REVOKED',
      entity_type: 'ATTESTATION',
      entity_id: att.id,
      outcome: 'SUCCESS',
      summary: `Revoked attestation ${att.id} (${att.apaar_masked}): ${att.revocation_reason}`,
    });

    res.json({
      attestation: att,
      audit_event: auditEvent,
    });
  });

  // Public GET verification by opaque token (/api/v1/verify/:token)
  app.get('/api/v1/verify/:token', (req, res) => {
    const reqId = `req_${Date.now().toString(36)}`;
    const rawToken = String(req.params.token || '').trim();
    const normalized = rawToken.toUpperCase();

    const found = state.attestations.find(
      (a) =>
        a.id.toUpperCase() === normalized ||
        (a.token && a.token.toUpperCase() === normalized) ||
        normalized.includes(a.id.toUpperCase())
    );

    if (!found) {
      res.status(404).json(
        createApiError(
          'TOKEN_NOT_FOUND',
          `No platform-issued attestation matches verification token '${rawToken}'.`,
          reqId
        )
      );
      return;
    }

    const result = verifyAttestationRecord(found);
    res.json({
      environment: 'SYNTHETIC',
      disclaimer:
        'Platform-issued enrolment attestation. Not an official government credential.',
      attestation: {
        id: found.id,
        token: found.token || found.id.toLowerCase(),
        issuer: 'WEAVE Platform Signing Authority (Synthetic Demo)',
        institution_name: found.institution_name,
        institution_id: found.institution_id,
        student_ref: found.student_ref,
        apaar_masked: found.apaar_masked,
        program_code: found.program_code,
        enrollment_year: found.enrollment_year,
        purpose: found.purpose,
        consent_id: found.consent_id,
        issued_at: found.issued_at,
        expires_at: found.expires_at,
        status: found.status,
        revocation_reason: found.revocation_reason,
        revoked_at: found.revoked_at,
        ed25519_key_id: found.ed25519_key_id,
        ed25519_signature: found.ed25519_signature,
      },
      verification: result,
    });
  });

  // Verify Attestation by ID or QR JSON payload (POST)
  app.post('/api/v1/attestations/verify', (req, res) => {
    const reqId = `req_${Date.now().toString(36)}`;
    const { query_or_payload = '' } = req.body || {};
    const trimmed = String(query_or_payload).trim();

    if (!trimmed) {
      res.status(400).json(
        createApiError(
          'VALIDATION_ERROR',
          'Provide an Attestation ID (e.g., ATT-2026-901) or QR verification JSON payload.',
          reqId
        )
      );
      return;
    }

    let targetId = trimmed;
    let tamperedSigOverride: string | undefined;

    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        targetId = parsed.att_id || '';
        tamperedSigOverride = parsed.sig;
      } catch {
        res.status(400).json(
          createApiError('INVALID_QR_PAYLOAD', 'Malformed JSON verification payload.', reqId)
        );
        return;
      }
    }

    const found = state.attestations.find(
      (a) =>
        a.id.toUpperCase() === targetId.toUpperCase() ||
        (a.token && a.token.toUpperCase() === targetId.toUpperCase())
    );

    if (!found) {
      res.status(404).json(
        createApiError(
          'ATTESTATION_NOT_FOUND',
          `No platform attestation found matching '${targetId}'.`,
          reqId
        )
      );
      return;
    }

    const recordToVerify: AttestationRecord = tamperedSigOverride
      ? { ...found, ed25519_signature: tamperedSigOverride }
      : found;

    const result = verifyAttestationRecord(recordToVerify);
    res.json({
      environment: 'SYNTHETIC',
      disclaimer:
        'Platform-issued enrolment attestation. Not an official government credential.',
      attestation: {
        id: found.id,
        student_ref: found.student_ref,
        student_name: found.student_name,
        apaar_masked: found.apaar_masked,
        institution_name: found.institution_name,
        program_code: found.program_code,
        enrollment_year: found.enrollment_year,
        purpose: found.purpose,
        issued_at: found.issued_at,
        expires_at: found.expires_at,
        status: found.status,
        revocation_reason: found.revocation_reason,
        revoked_at: found.revoked_at,
        ed25519_key_id: found.ed25519_key_id,
        ed25519_signature: found.ed25519_signature,
      },
      verification: result,
    });
  });

  // Audit Events & Chain Integrity Check
  app.get('/api/v1/audit-events', (req, res) => {
    const institutionId = req.query.institution_id as string | undefined;
    const role = ((req.query.role as string) || 'auditor') as RolePersona;
    const chainCheck = verifyAuditChain(state.auditEvents);

    const events =
      isInstitutionScopedRole(role) && institutionId
        ? state.auditEvents.filter((e) => e.institution_id === institutionId)
        : state.auditEvents;

    res.json({
      environment: 'SYNTHETIC',
      chain_integrity: chainCheck,
      events,
    });
  });

  // Read-only Administrative Copilot (Permission-Scoped Advisory Guidance)
  app.post('/api/v1/assistant/query', (req, res) => {
    const {
      prompt = '',
      role = 'institution_operator',
      institution_id = 'INST-KKR-101',
    } = req.body || {};
    const q = String(prompt).toLowerCase();
    const instScoped = isInstitutionScopedRole(role as RolePersona);

    const scopedBatches = instScoped
      ? state.batches.filter((b) => b.institution_id === institution_id)
      : state.batches;
    const latestBatch = scopedBatches[0] || state.batches[0];

    if (q.includes('stu-002') || q.includes('rule') || q.includes('program')) {
      res.json({
        environment: 'SYNTHETIC',
        advisory_only: true,
        facts: [
          'Rule STU-002 (RULE-PROG-CODE) verifies that each student record’s program_code matches an approved AICTE discipline registered for the institution.',
          `In batch ${latestBatch.id}, row STU-2026-105 failed STU-002 because 'BTECH-ASTRO' is not in the sanctioned registry.`,
        ],
        suggestions: [
          'Map the source department code to one of the sanctioned codes (BTECH-CSE, BTECH-ECE, BTECH-ME, MTECH-AI, MBA-CORE, MCA-GEN) before re-uploading.',
          'Inspect the affected row in Batch Validation Results to download the structured error report.',
        ],
        uncertainty:
          'This assistant cannot verify whether an institution has a pending AICTE approval letter outside the current synthetic registry.',
        sources: [
          { label: `Batch ${latestBatch.id} Validation Results`, route: `/app/imports/${latestBatch.id}` },
          { label: 'Program & Intake Management', route: '/app/programs' },
        ],
      });
      return;
    }

    if (q.includes('intake') || q.includes('capacity') || q.includes('exception')) {
      const scopedInsts = instScoped
        ? state.institutions.filter((i) => i.id === institution_id)
        : state.institutions;
      const nearOrOver = scopedInsts.flatMap((inst) =>
        inst.programs
          .filter((p) => p.enrolled_verified / p.approved_intake >= 0.95)
          .map(
            (p) =>
              `${inst.id} · ${p.program_code}: ${p.enrolled_verified}/${p.approved_intake} seats (${Math.round(
                (p.enrolled_verified / p.approved_intake) * 100
              )}%)`
          )
      );
      res.json({
        environment: 'SYNTHETIC',
        advisory_only: true,
        facts:
          nearOrOver.length > 0
            ? nearOrOver
            : ['All authorized programs are currently below 95% of approved intake capacity.'],
        suggestions: [
          'Review programs above 95% utilization in Approved Intake Monitoring before committing additional batch rows.',
        ],
        uncertainty:
          'Supernumerary quota exemptions (EWS/TFW/PMSSS) require manual verification by a regulator officer.',
        sources: [
          { label: 'Approved Intake Monitoring', route: '/app/intake' },
          { label: 'Institution Overview', route: '/app' },
        ],
      });
      return;
    }

    if (q.includes('conflict') || q.includes('duplicate')) {
      const openCount = state.conflicts.filter((c) => c.status === 'OPEN').length;
      res.json({
        environment: 'SYNTHETIC',
        advisory_only: true,
        facts: [
          `There are currently ${openCount} unresolved cross-institution conflict candidates in the system.`,
          instScoped
            ? 'As an institution-scoped user, counterpart institution identities are redacted to preserve tenant isolation.'
            : 'As a regulator user, you can adjudicate open candidates in Duplicate & Conflict Review.',
        ],
        suggestions: [
          'Navigate to Duplicate & Conflict Review to inspect match evidence and academic-year overlap.',
          'Remember that a candidate hash match is not proof of fraud; verify counselling withdrawal receipts before confirming.',
        ],
        uncertainty:
          'Automated hash matching cannot determine student intent when counselling round withdrawals are delayed.',
        sources: [
          { label: 'Duplicate & Conflict Review', route: '/app/duplicates' },
          { label: 'Audit Timeline', route: '/app/audit' },
        ],
      });
      return;
    }

    res.json({
      environment: 'SYNTHETIC',
      advisory_only: true,
      facts: [
        `Latest authorized batch ${latestBatch.id} (${latestBatch.filename}) processed ${latestBatch.total_rows} rows: ${latestBatch.passed_rows} verified, ${latestBatch.flagged_rows} flagged, and ${latestBatch.failed_rows} failed.`,
        'Most frequent validation issues in recent synthetic imports are STU-001 (invalid APAAR leading digit 0/1), STU-002 (unregistered program code), and STU-005 (cross-institution APAAR hash collision).',
      ],
      suggestions: [
        `Open Batch ${latestBatch.id} Validation Results to filter issues by severity and rule code.`,
        'Use the CSV Import Wizard template to ensure all 7 required columns are formatted prior to upload.',
      ],
      uncertainty:
        'Advisory summary is scoped strictly to synthetic records authorized for your current role.',
      sources: [
        { label: `Inspect Batch ${latestBatch.id}`, route: `/app/imports/${latestBatch.id}` },
        { label: 'CSV Import Wizard', route: '/app/imports/new' },
      ],
    });
  });

  // Deterministic Offline WEAVE Assistant Endpoint (/api/v1/assistant/chat)
  // 100% offline-capable, rule-based matching with zero LLM API / external key dependencies.
  app.post('/api/v1/assistant/chat', (req, res) => {
    const {
      messages = [],
      role = 'institution_operator',
      institution_id = 'INST-KKR-101',
    } = req.body || {};

    const instScoped = isInstitutionScopedRole(role as RolePersona);
    const scopedBatches = instScoped
      ? state.batches.filter((b) => b.institution_id === institution_id)
      : state.batches;
    const latestBatch = scopedBatches[0] || state.batches[0];

    const normalizedMessages: Array<{ role: 'user' | 'model'; text: string }> = Array.isArray(messages)
      ? messages
          .filter((m) => m && typeof m.text === 'string' && m.text.trim())
          .map((m) => ({
            role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
            text: String(m.text).trim(),
          }))
      : [];

    const lastUserMessage =
      normalizedMessages.length > 0
        ? normalizedMessages[normalizedMessages.length - 1].text
        : 'What is WEAVE?';

    // Match intent from curated knowledge base
    const match = matchKnowledgeIntent(lastUserMessage);
    const matchedEntry = match.matchedEntry;

    let reply = '';
    let followUps: string[] = [];

    if (matchedEntry) {
      reply = matchedEntry.answer;
      followUps = matchedEntry.followUpQuestions || [];
    } else {
      // Fallback message recommending similar topics
      const suggestions = match.suggestedEntries.slice(0, 3);
      reply =
        `I don't have a direct rulebook answer for "${lastUserMessage}".\n\n` +
        `As an institutional trust system for SIH26263, I operate strictly on curated compliance, validation, and governance rules without external generative models.\n\n` +
        `**Here are recommended topics you can explore:**\n` +
        suggestions.map((s) => `• **${s.canonicalQuestion}**`).join('\n') +
        `\n\nYou can also browse categories or select a suggested topic below.`;
      followUps = suggestions.map((s) => s.canonicalQuestion);
    }

    res.json({
      environment: 'SYNTHETIC',
      advisory_only: true,
      model_used: 'deterministic-knowledge-base',
      requested_model: 'offline-ruleset-v2026.10',
      confidence: match.confidence,
      matched_question: matchedEntry?.canonicalQuestion || null,
      reply,
      follow_up_questions: followUps,
      sources: [
        { label: `Batch ${latestBatch.id} Results`, route: `/app/imports/${latestBatch.id}` },
        { label: 'Duplicate & Conflict Review', route: '/app/duplicates' },
        { label: 'Approved Intake Monitoring', route: '/app/intake' },
        { label: 'Audit Timeline', route: '/app/audit' },
      ],
    });
  });

  // Offline Voice / Text Query Dispatcher (/api/v1/assistant/transcribe)
  app.post('/api/v1/assistant/transcribe', (req, res) => {
    const { samplePromptHint = '' } = req.body || {};
    res.json({
      environment: 'SYNTHETIC',
      model: 'offline-deterministic',
      transcript:
        samplePromptHint ||
        'How does WEAVE detect cross-institution duplicate enrolments?',
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WEAVE (SIH26263) server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
