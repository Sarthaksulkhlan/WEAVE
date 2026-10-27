import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  FileCheck2,
  Lock,
  Building2,
  Scale,
  Box,
  Play,
  Pause,
} from 'lucide-react';
import { WeaveLogo } from '../../components/ui/WeaveLogo';
import { WeaveSpatialScene } from '../spatial/WeaveSpatialScene';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeWorkspacePreview, setActiveWorkspacePreview] = useState<
    'institution' | 'regulator' | 'verification'
  >('institution');
  const [heroViewMode, setHeroViewMode] = useState<'editorial' | '3d'>('editorial');
  const [activeStageIdx, setActiveStageIdx] = useState<number>(0);
  const [pipelinePlaying, setPipelinePlaying] = useState<boolean>(true);

  useEffect(() => {
    if (!pipelinePlaying || heroViewMode !== 'editorial') return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;
    const timer = window.setInterval(() => {
      setActiveStageIdx((prev) => (prev + 1) % 4);
    }, 2400);
    return () => window.clearInterval(timer);
  }, [pipelinePlaying, heroViewMode]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F2] text-[#20241F]">
      {/* Top Bar Contract: 3 Zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-[#F7F6F2]/95 backdrop-blur-xs border-b border-[#DEDDD5]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <Link to="/" aria-label="WEAVE Home" className="shrink-0">
            <WeaveLogo />
          </Link>

          <nav
            aria-label="Public Navigation"
            className="hidden md:flex items-center gap-8 text-sm font-medium text-[#686B65]"
          >
            <a
              href="#product"
              className="hover:text-[#20241F] transition-colors whitespace-nowrap shrink-0"
            >
              Product
            </a>
            <a
              href="#how-it-works"
              className="hover:text-[#20241F] transition-colors whitespace-nowrap shrink-0"
            >
              How it works
            </a>
            <a
              href="#trust-security"
              className="hover:text-[#20241F] transition-colors whitespace-nowrap shrink-0"
            >
              Trust &amp; Security
            </a>
            <Link
              to="/app/topology"
              className="inline-flex items-center gap-1.5 text-[#244C3A] hover:text-[#193B2C] transition-colors whitespace-nowrap shrink-0"
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Topology</span>
            </Link>
            <Link
              to="/login"
              className="hover:text-[#20241F] transition-colors whitespace-nowrap shrink-0"
            >
              Sign in
            </Link>
          </nav>

          <div className="flex items-center gap-4 shrink-0">
            <Link
              to="/app"
              className="px-4 py-2 text-xs font-medium text-white bg-[#244C3A] hover:bg-[#193B2C] rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              Open workspace
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-6 py-16 lg:py-24 border-b border-[#DEDDD5]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            {/* Left Column: Editorial Headline & Actions */}
            <div className="lg:col-span-6 space-y-6">
              <div className="text-xs font-mono font-medium tracking-widest uppercase text-[#244C3A]">
                ACADEMIC IDENTITY INFRASTRUCTURE
              </div>

              <h1
                className="font-display font-bold text-[#20241F] tracking-tight leading-[1.08]"
                style={{ fontSize: 'clamp(2.25rem, 3.8vw, 3.5rem)', textWrap: 'balance' }}
              >
                Academic records. Connected by trust.
              </h1>

              <p className="text-base sm:text-lg text-[#686B65] leading-relaxed max-w-xl">
                WEAVE helps educational institutions validate student records, identify enrolment
                conflicts and make authorized academic verification more transparent.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/app')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#244C3A] hover:bg-[#193B2C] rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Explore the platform</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <Link
                  to="/login"
                  className="px-5 py-2.5 text-sm font-medium text-[#20241F] bg-white border border-[#DEDDD5] hover:bg-[#F0EFE9] rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  Sign in to workspace
                </Link>
                <Link
                  to="/app/topology"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-[#244C3A] bg-[#EAF2EE] border border-[#244C3A]/30 hover:bg-[#dcebe3] rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  <Box className="w-4 h-4" />
                  <span>Launch 3D Vault</span>
                </Link>
              </div>

              <div className="pt-4 border-t border-[#DEDDD5] text-xs text-[#686B65] flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>SIH26263 Reference Architecture</span>
                <span aria-hidden="true">·</span>
                <span>Masked APAAR Storage</span>
                <span aria-hidden="true">·</span>
                <span>Deterministic Rule Engine</span>
              </div>
            </div>

            {/* Right Column: Live Editorial Record-Flow Visualization + 3D Apparatus Switcher */}
            <div className="lg:col-span-6">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <div className="inline-flex items-center p-0.5 bg-[#E9E7DF] border border-[#DEDDD5] rounded-md text-xs">
                  <button
                    type="button"
                    onClick={() => setHeroViewMode('editorial')}
                    className={`px-3 py-1 rounded-xs font-medium transition-colors ${
                      heroViewMode === 'editorial'
                        ? 'bg-white text-[#20241F] shadow-2xs'
                        : 'text-[#686B65] hover:text-[#20241F]'
                    }`}
                  >
                    Live Pipeline Schematic
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeroViewMode('3d')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xs font-medium transition-colors ${
                      heroViewMode === '3d'
                        ? 'bg-[#244C3A] text-white shadow-2xs'
                        : 'text-[#686B65] hover:text-[#20241F]'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>Interactive 3D Apparatus</span>
                  </button>
                </div>

                {heroViewMode === 'editorial' && (
                  <button
                    type="button"
                    onClick={() => setPipelinePlaying((p) => !p)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono text-[#686B65] hover:text-[#20241F] bg-white border border-[#DEDDD5] rounded-sm"
                  >
                    {pipelinePlaying ? (
                      <>
                        <Pause className="w-3 h-3 text-[#244C3A]" /> Pause Cycle
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 text-[#244C3A]" /> Play Cycle
                      </>
                    )}
                  </button>
                )}
              </div>

              {heroViewMode === '3d' ? (
                <WeaveSpatialScene embedded />
              ) : (
                <div
                  className="bg-white border border-[#DEDDD5] rounded-md p-6 relative overflow-hidden"
                  aria-label="Illustrative diagram of academic records moving through deterministic validation stages"
                >
                  {/* Header Caption */}
                  <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#DEDDD5] text-xs">
                    <span className="font-medium text-[#20241F]">
                      Deterministic Record Verification Pipeline
                    </span>
                    <span className="font-mono text-[11px] text-[#686B65]">
                      Illustrative example · Synthetic data
                    </span>
                  </div>

                  {/* Animated SVG Telemetry Header Strip */}
                  <div className="mb-5 p-3 bg-[#F7F6F2] border border-[#DEDDD5] rounded-sm">
                    <svg
                      viewBox="0 0 480 42"
                      className="w-full h-10 overflow-visible"
                      aria-hidden="true"
                    >
                      {/* Base Track */}
                      <line
                        x1="28"
                        y1="21"
                        x2="452"
                        y2="21"
                        stroke="#DEDDD5"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />
                      {/* Active Progress Track */}
                      <line
                        x1="28"
                        y1="21"
                        x2={28 + (activeStageIdx / 3) * 424}
                        y2="21"
                        stroke="#244C3A"
                        strokeWidth="2.5"
                        style={{ transition: 'x2 600ms cubic-bezier(0.22, 1, 0.36, 1)' }}
                      />
                      {/* 4 Stage Nodes */}
                      {[
                        { x: 28, code: '01 INGEST' },
                        { x: 169, code: '02 VALIDATE' },
                        { x: 310, code: '03 REVIEW' },
                        { x: 452, code: '04 ATTEST' },
                      ].map((pt, i) => {
                        const isReached = i <= activeStageIdx;
                        const isCurrent = i === activeStageIdx;
                        return (
                          <g
                            key={pt.code}
                            onClick={() => setActiveStageIdx(i)}
                            className="cursor-pointer"
                          >
                            <circle
                              cx={pt.x}
                              cy={21}
                              r={isCurrent ? 8 : 5.5}
                              fill={isReached ? '#244C3A' : '#FFFFFF'}
                              stroke={isReached ? '#244C3A' : '#9E9D95'}
                              strokeWidth="2"
                              style={{ transition: 'all 400ms ease' }}
                            />
                            <text
                              x={pt.x}
                              y={38}
                              textAnchor={i === 0 ? 'start' : i === 3 ? 'end' : 'middle'}
                              fill={isCurrent ? '#20241F' : '#686B65'}
                              fontSize="9"
                              fontFamily="JetBrains Mono, monospace"
                              fontWeight={isCurrent ? '600' : '400'}
                            >
                              {pt.code}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Connected Architectural Stages */}
                  <div className="relative space-y-4">
                    {/* Vertical connecting line */}
                    <div
                      aria-hidden="true"
                      className="absolute left-[19px] top-6 bottom-6 w-px bg-[#DEDDD5]"
                    />

                    {/* Stage 1: Record received */}
                    <div
                      onClick={() => setActiveStageIdx(0)}
                      className="relative flex items-start gap-4 cursor-pointer transition-transform duration-300"
                    >
                      <div
                        className={`w-10 h-10 rounded-md border flex items-center justify-center shrink-0 z-10 font-mono text-xs font-semibold transition-colors duration-300 ${
                          activeStageIdx === 0
                            ? 'bg-[#244C3A] text-white border-[#244C3A]'
                            : 'bg-[#F0EFE9] text-[#20241F] border-[#DEDDD5]'
                        }`}
                      >
                        01
                      </div>
                      <div
                        className={`flex-1 p-3.5 border rounded-md transition-colors duration-300 ${
                          activeStageIdx === 0
                            ? 'bg-white border-[#244C3A] shadow-2xs'
                            : 'bg-[#F7F6F2] border-[#DEDDD5]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#20241F]">
                            Record received.
                          </span>
                          <span className="font-mono text-[11px] text-[#686B65] tabular-nums">
                            BAT-2026-003 · Row 01
                          </span>
                        </div>
                        <div className="mt-1.5 font-mono text-xs text-[#686B65] tabular-nums flex flex-wrap items-center gap-x-2">
                          <span>STU-2026-101</span>
                          <span>·</span>
                          <span>APAAR ****-****-4756</span>
                          <span>·</span>
                          <span>BTECH-CSE</span>
                        </div>
                      </div>
                    </div>

                    {/* Stage 2: Validation completed */}
                    <div
                      onClick={() => setActiveStageIdx(1)}
                      className="relative flex items-start gap-4 cursor-pointer transition-transform duration-300"
                    >
                      <div
                        className={`w-10 h-10 rounded-md border flex items-center justify-center shrink-0 z-10 font-mono text-xs font-semibold transition-colors duration-300 ${
                          activeStageIdx === 1
                            ? 'bg-[#244C3A] text-white border-[#244C3A]'
                            : 'bg-[#F0EFE9] text-[#244C3A] border-[#244C3A]'
                        }`}
                      >
                        02
                      </div>
                      <div
                        className={`flex-1 p-3.5 border rounded-md transition-colors duration-300 ${
                          activeStageIdx === 1
                            ? 'bg-white border-[#244C3A] shadow-2xs'
                            : 'bg-white border-[#DEDDD5]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#20241F]">
                            Validation completed.
                          </span>
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-[#1E563B]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Ruleset 2026.10.v1</span>
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#686B65]">
                          Format, sanctioned program code, and academic age window verified without
                          exposing full identifier.
                        </p>
                      </div>
                    </div>

                    {/* Stage 3: Review required */}
                    <div
                      onClick={() => setActiveStageIdx(2)}
                      className="relative flex items-start gap-4 cursor-pointer transition-transform duration-300"
                    >
                      <div
                        className={`w-10 h-10 rounded-md border flex items-center justify-center shrink-0 z-10 font-mono text-xs font-semibold transition-colors duration-300 ${
                          activeStageIdx === 2
                            ? 'bg-[#8E6218] text-white border-[#8E6218]'
                            : 'bg-[#F0EFE9] text-[#8E6218] border-[#DEDDD5]'
                        }`}
                      >
                        03
                      </div>
                      <div
                        className={`flex-1 p-3.5 border rounded-md transition-colors duration-300 ${
                          activeStageIdx === 2
                            ? 'bg-white border-[#8E6218] shadow-2xs'
                            : 'bg-[#F7F6F2] border-[#DEDDD5]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#20241F]">
                            Review required.
                          </span>
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-[#8E6218]">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Candidate CNF-2026-019</span>
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#686B65]">
                          Cross-institution APAAR digest match routed to authorized human review
                          queue; never auto-deleted.
                        </p>
                      </div>
                    </div>

                    {/* Stage 4: Verification available */}
                    <div
                      onClick={() => setActiveStageIdx(3)}
                      className="relative flex items-start gap-4 cursor-pointer transition-transform duration-300"
                    >
                      <div
                        className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 z-10 font-mono text-xs font-semibold transition-colors duration-300 ${
                          activeStageIdx === 3
                            ? 'bg-[#244C3A] text-white'
                            : 'bg-[#244C3A]/85 text-white'
                        }`}
                      >
                        04
                      </div>
                      <div
                        className={`flex-1 p-3.5 bg-white border rounded-md transition-colors duration-300 ${
                          activeStageIdx === 3
                            ? 'border-[#244C3A] shadow-2xs'
                            : 'border-[#244C3A]/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#20241F]">
                            Verification available.
                          </span>
                          <Link
                            to="/verify/att-2026-901"
                            className="font-mono text-[11px] font-medium text-[#244C3A] underline hover:text-[#193B2C]"
                          >
                            Inspect /verify/att-2026-901
                          </Link>
                        </div>
                        <p className="mt-1 text-xs text-[#686B65] font-mono tabular-nums">
                          Ed25519 signed platform attestation · Consent CNS-2026-4401 · Revocable
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section A — The Problem */}
        <section id="product" className="max-w-6xl mx-auto px-6 py-16 lg:py-20 border-b border-[#DEDDD5]">
          <div className="max-w-2xl">
            <div className="text-xs font-mono uppercase tracking-widest text-[#686B65]">
              01 · Structural Context
            </div>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-[#20241F]">
              Academic data should not be difficult to trust.
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-[#DEDDD5]">
            <div className="space-y-2.5">
              <div className="text-xs font-mono text-[#244C3A] font-semibold">
                01.1 · Institutional Silos
              </div>
              <h3 className="font-display text-lg font-semibold text-[#20241F]">
                Fragmented student records.
              </h3>
              <p className="text-sm text-[#686B65] leading-relaxed">
                Admissions rosters arrive across disparate spreadsheet schemas, making it difficult
                to validate program codes, eligibility windows, and identifier integrity before
                records are committed.
              </p>
            </div>

            <div className="space-y-2.5 md:border-l md:border-[#DEDDD5] md:pl-8">
              <div className="text-xs font-mono text-[#244C3A] font-semibold">
                01.2 · Cross-Campus Collisions
              </div>
              <h3 className="font-display text-lg font-semibold text-[#20241F]">
                Inconsistent and duplicate submissions.
              </h3>
              <p className="text-sm text-[#686B65] leading-relaxed">
                During multi-round counselling, a student record may appear simultaneously on two
                institutional rosters. Resolving overlaps requires structured human review rather
                than opaque automated rejection.
              </p>
            </div>

            <div className="space-y-2.5 md:border-l md:border-[#DEDDD5] md:pl-8">
              <div className="text-xs font-mono text-[#244C3A] font-semibold">
                01.3 · Verification Opacity
              </div>
              <h3 className="font-display text-lg font-semibold text-[#20241F]">
                Limited visibility into enrolment and verification.
              </h3>
              <p className="text-sm text-[#686B65] leading-relaxed">
                Regulators need accurate approved-intake utilization across disciplines, while
                scholarship and credit bodies need verifiable, minimal-disclosure enrolment
                attestations without exposing raw identifiers.
              </p>
            </div>
          </div>
        </section>

        {/* Section B — How WEAVE Works */}
        <section id="how-it-works" className="bg-[#F0EFE9] border-b border-[#DEDDD5] py-16 lg:py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-2xl">
              <div className="text-xs font-mono uppercase tracking-widest text-[#686B65]">
                02 · Deterministic Workflow
              </div>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-[#20241F]">
                From submission to verification.
              </h2>
            </div>

            {/* Connected 4-Stage Horizontal Timeline on Desktop / Vertical on Mobile */}
            <ol className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-6 relative">
              {[
                {
                  step: 'Stage 01',
                  title: 'Submit',
                  desc: 'Institutions import student records via structured CSV batches with required-column preflight checks.',
                },
                {
                  step: 'Stage 02',
                  title: 'Validate',
                  desc: 'Deterministic rules identify missing or inconsistent information, masking raw APAAR values immediately.',
                },
                {
                  step: 'Stage 03',
                  title: 'Review',
                  desc: 'Authorized officers investigate potential cross-institution conflicts with documented rationale.',
                },
                {
                  step: 'Stage 04',
                  title: 'Verify',
                  desc: 'Authorized claims can be checked through a signed platform-issued Ed25519 attestation.',
                },
              ].map((item, idx) => (
                <li
                  key={item.step}
                  className="bg-white border border-[#DEDDD5] rounded-md p-5 flex flex-col justify-between relative"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono text-[#686B65] pb-3 border-b border-[#DEDDD5]">
                      <span>{item.step}</span>
                      <span className="text-[#244C3A] font-semibold">0{idx + 1}</span>
                    </div>
                    <h3 className="mt-4 font-display text-base font-semibold text-[#20241F]">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-xs text-[#686B65] leading-relaxed">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Section C — The Workspace */}
        <section className="max-w-6xl mx-auto px-6 py-16 lg:py-20 border-b border-[#DEDDD5]">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-[#686B65]">
                03 · Role-Scoped Interfaces
              </div>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-[#20241F]">
                Clarity for every role.
              </h2>
            </div>

            {/* Interactive Workspace Switcher */}
            <div className="flex items-center gap-1 p-1 bg-[#E9E7DF] rounded-md self-start">
              <button
                type="button"
                onClick={() => setActiveWorkspacePreview('institution')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 ${
                  activeWorkspacePreview === 'institution'
                    ? 'bg-white text-[#20241F] shadow-2xs'
                    : 'text-[#686B65] hover:text-[#20241F]'
                }`}
              >
                Institution workspace
              </button>
              <button
                type="button"
                onClick={() => setActiveWorkspacePreview('regulator')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 ${
                  activeWorkspacePreview === 'regulator'
                    ? 'bg-white text-[#20241F] shadow-2xs'
                    : 'text-[#686B65] hover:text-[#20241F]'
                }`}
              >
                Regulatory oversight
              </button>
              <button
                type="button"
                onClick={() => setActiveWorkspacePreview('verification')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 ${
                  activeWorkspacePreview === 'verification'
                    ? 'bg-white text-[#20241F] shadow-2xs'
                    : 'text-[#686B65] hover:text-[#20241F]'
                }`}
              >
                Verification portal
              </button>
            </div>
          </div>

          {/* Live Component Previews Consistent with Implemented Pages */}
          <div className="mt-8 bg-white border border-[#DEDDD5] rounded-md p-6">
            {activeWorkspacePreview === 'institution' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-5 space-y-3">
                  <div className="inline-flex items-center gap-2 text-xs font-mono text-[#244C3A]">
                    <Building2 className="w-4 h-4" />
                    <span>Institution workspace.</span>
                  </div>
                  <h3 className="font-display text-xl font-semibold text-[#20241F]">
                    Batch ingestion, explainable rule diagnostics, and sanctioned intake tracking.
                  </h3>
                  <p className="text-sm text-[#686B65] leading-relaxed">
                    Institution operators and administrators upload CSV batches, inspect row-level
                    validation outcomes (STU-001 through STU-006), and commit eligible records
                    within their isolated institutional tenant.
                  </p>
                  <div className="pt-2">
                    <Link
                      to="/app/imports/BAT-2026-003"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#244C3A] hover:text-[#193B2C] underline"
                    >
                      <span>Open Batch BAT-2026-003 Validation Inspector</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="lg:col-span-7 bg-[#F7F6F2] border border-[#DEDDD5] rounded-md p-4">
                  <div className="flex items-center justify-between text-xs pb-3 border-b border-[#DEDDD5]">
                    <span className="font-mono font-semibold text-[#20241F]">
                      BAT-2026-003 · nit_kkr_ug_round3_counselling.csv
                    </span>
                    <span className="font-mono text-[#686B65]">Ruleset 2026.10.v1</span>
                  </div>
                  <table className="w-full text-left border-collapse mt-3 text-xs">
                    <thead>
                      <tr className="border-b border-[#DEDDD5] text-[#686B65]">
                        <th className="py-2 pr-3">Row Ref</th>
                        <th className="py-2 px-3">Masked APAAR</th>
                        <th className="py-2 px-3">Rule Outcome</th>
                        <th className="py-2 pl-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DEDDD5] font-mono tabular-nums">
                      <tr>
                        <td className="py-2 pr-3 text-[#20241F]">STU-2026-101</td>
                        <td className="py-2 px-3 text-[#686B65]">****-****-4756</td>
                        <td className="py-2 px-3 text-[#1E563B]">STU-001..004 PASS</td>
                        <td className="py-2 pl-3 text-right text-[#1E563B]">Verified</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-3 text-[#20241F]">STU-2026-103</td>
                        <td className="py-2 px-3 text-[#686B65]">****-****-8472</td>
                        <td className="py-2 px-3 text-[#8E6218]">STU-005 WARN (Collision)</td>
                        <td className="py-2 pl-3 text-right text-[#8E6218]">Awaiting Review</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-3 text-[#20241F]">STU-2026-105</td>
                        <td className="py-2 px-3 text-[#686B65]">****-****-6512</td>
                        <td className="py-2 px-3 text-[#99322B]">STU-001, STU-002 FAIL</td>
                        <td className="py-2 pl-3 text-right text-[#99322B]">Invalid Record</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeWorkspacePreview === 'regulator' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-5 space-y-3">
                  <div className="inline-flex items-center gap-2 text-xs font-mono text-[#244C3A]">
                    <Scale className="w-4 h-4" />
                    <span>Regulatory oversight.</span>
                  </div>
                  <h3 className="font-display text-xl font-semibold text-[#20241F]">
                    Cross-institution duplicate adjudication and intake capacity governance.
                  </h3>
                  <p className="text-sm text-[#686B65] leading-relaxed">
                    Regulator officers review candidate APAAR hash matches across institutions,
                    compare sanctioned intake against committed enrolment, and record mandatory
                    audit reasons for every decision.
                  </p>
                  <div className="pt-2">
                    <Link
                      to="/app/duplicates"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#244C3A] hover:text-[#193B2C] underline"
                    >
                      <span>Open Regulator Duplicate Review Queue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="lg:col-span-7 bg-[#F7F6F2] border border-[#DEDDD5] rounded-md p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-[#DEDDD5]">
                    <span className="font-mono font-semibold text-[#20241F]">
                      Candidate CNF-2026-019 · CROSS_INSTITUTION_DUPLICATE
                    </span>
                    <span className="font-mono text-[#8E6218]">Similarity: 0.99</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white border border-[#DEDDD5] rounded-sm">
                      <div className="text-[#686B65]">Primary Submission</div>
                      <div className="font-semibold text-[#20241F] mt-0.5">
                        NIT Kurukshetra (INST-KKR-101)
                      </div>
                      <div className="font-mono text-[#686B65] mt-0.5">
                        BTECH-CSE · AY 2026–27
                      </div>
                    </div>
                    <div className="p-3 bg-white border border-[#DEDDD5] rounded-sm">
                      <div className="text-[#686B65]">Counterpart Registration</div>
                      <div className="font-semibold text-[#20241F] mt-0.5">
                        IIET Delhi (INST-DEL-202)
                      </div>
                      <div className="font-mono text-[#686B65] mt-0.5">
                        BTECH-CSE · AY 2026–27
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#686B65]">
                    Note: A candidate hash match is not proof of fraud. Officers verify withdrawal
                    documentation before confirming or dismissing.
                  </p>
                </div>
              </div>
            )}

            {activeWorkspacePreview === 'verification' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-5 space-y-3">
                  <div className="inline-flex items-center gap-2 text-xs font-mono text-[#244C3A]">
                    <FileCheck2 className="w-4 h-4" />
                    <span>Verification portal.</span>
                  </div>
                  <h3 className="font-display text-xl font-semibold text-[#20241F]">
                    Public token verification with minimal disclosure and revocation checks.
                  </h3>
                  <p className="text-sm text-[#686B65] leading-relaxed">
                    External verifiers inspect opaque verification tokens (`/verify/:token`) to
                    confirm Ed25519 signature validity, expiry, and revocation status without
                    receiving raw student identifiers.
                  </p>
                  <div className="pt-2">
                    <Link
                      to="/verify/att-2026-901"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#244C3A] hover:text-[#193B2C] underline"
                    >
                      <span>Open Public Verification Portal (/verify/att-2026-901)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="lg:col-span-7 bg-[#F7F6F2] border border-[#DEDDD5] rounded-md p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-[#DEDDD5]">
                    <span className="font-mono font-semibold text-[#1E563B]">
                      VERIFIED_ACTIVE · Token att-2026-901
                    </span>
                    <span className="font-mono text-[#686B65]">Key: ed25519-weave-synth-2026-k1</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono tabular-nums text-[#20241F]">
                    <div>Subject Ref: STU-2026-101</div>
                    <div>Masked APAAR: ****-****-4756</div>
                    <div>Program: BTECH-CSE (2026)</div>
                    <div>Consent: CNS-2026-4401</div>
                  </div>
                  <div className="pt-2 border-t border-[#DEDDD5] text-[11px] text-[#686B65]">
                    Platform-issued enrolment attestation. Not an official government credential.
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section D — Trust and Privacy */}
        <section
          id="trust-security"
          className="max-w-6xl mx-auto px-6 py-16 lg:py-20 border-b border-[#DEDDD5]"
        >
          <div className="max-w-2xl">
            <div className="text-xs font-mono uppercase tracking-widest text-[#686B65]">
              04 · Governance &amp; Security Architecture
            </div>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-[#20241F]">
              Designed to handle records responsibly.
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Role-based access.',
                desc: 'Five distinct operational roles (regulator_admin, regulator_officer, institution_admin, institution_operator, auditor) with backend-enforced permissions.',
              },
              {
                title: 'Institution-level data isolation.',
                desc: 'Institution users access only their own roster, batches, and intake slices; counterpart institution identities in conflict queues are redacted.',
              },
              {
                title: 'Minimal disclosure.',
                desc: 'Full 12-digit APAAR identifiers are never returned in API responses, UI tables, or QR URLs. Aadhaar columns are rejected at ingestion.',
              },
              {
                title: 'Auditable changes.',
                desc: 'Critical batch imports, conflict adjudications, and credential revocations append structured events to a verifiable hash-linked audit timeline.',
              },
              {
                title: 'Explainable validation.',
                desc: 'Every validation failure or warning cites a deterministic rule code (STU-001..STU-006), affected field, and remediation path—never an LLM guess.',
              },
              {
                title: 'Explicitly labelled platform-issued verification.',
                desc: 'Attestations are signed with platform Ed25519 keys and clearly disclosed as synthetic platform credentials, never claiming unauthorized government API integration.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="p-5 bg-white border border-[#DEDDD5] rounded-md space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-semibold text-[#20241F]">
                    {item.title}
                  </h3>
                  <Lock className="w-3.5 h-3.5 text-[#686B65] shrink-0" />
                </div>
                <p className="text-xs text-[#686B65] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section E — Final Call to Action */}
        <section className="bg-[#F0EFE9] py-16 border-b border-[#DEDDD5]">
          <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="text-xs font-mono uppercase tracking-widest text-[#244C3A]">
                SIH26263 Demonstration Workspace
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#20241F]">
                Build confidence into every academic record.
              </h2>
              <p className="text-sm text-[#686B65] max-w-xl">
                Explore the institutional and regulatory workspaces using synthetic demonstration
                fixtures or test the public attestation verifier.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                to="/app"
                className="px-5 py-2.5 text-sm font-medium text-white bg-[#244C3A] hover:bg-[#193B2C] rounded-md transition-colors whitespace-nowrap"
              >
                Open workspace
              </Link>
              <Link
                to="/verify/att-2026-901"
                className="px-5 py-2.5 text-sm font-medium text-[#20241F] bg-white border border-[#DEDDD5] hover:bg-[#F7F6F2] rounded-md transition-colors whitespace-nowrap"
              >
                Verify sample credential
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Restrained Institutional Footer */}
      <footer className="bg-[#F7F6F2] py-10 px-6 text-xs text-[#686B65]">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#DEDDD5]">
            <div className="flex items-center gap-3">
              <WeaveLogo />
              <span aria-hidden="true">·</span>
              <span className="font-mono">Problem Statement SIH26263</span>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <a href="#product" className="hover:text-[#20241F] transition-colors">
                Product
              </a>
              <a href="#trust-security" className="hover:text-[#20241F] transition-colors">
                Trust &amp; Security
              </a>
              <Link to="/app/audit" className="hover:text-[#20241F] transition-colors">
                Documentation &amp; Rules
              </Link>
              <Link to="/login" className="hover:text-[#20241F] transition-colors">
                Sign in
              </Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] leading-relaxed">
            <p>
              Synthetic Data &amp; Integration Disclaimer: All student records, APAAR identifiers,
              institutions, and Ed25519 attestations in this environment are strictly synthetic.
              This platform does not claim live integration with official government APAAR,
              DigiLocker, or AICTE production systems.
            </p>
            <span className="font-mono shrink-0 text-[#20241F]">Contract /api/v1</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
