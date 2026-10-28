import React, { useState, useEffect } from 'react';
import { Check, AlertTriangle, ShieldCheck, Play, Pause, RefreshCw, FileText, ArrowRight } from 'lucide-react';

export type StrataPhase = 'colorless' | 'color_formula' | 'fracture';

export interface WeavePipelineLayer {
  id: string;
  code: string;
  title: string;
  roleScope: string;
  testsCount: string;
  // Semantic status and metrics
  boundaryScore: string;
  scoreStatus: string;
  scoreColor: string;
  // Stratum background and wavy stroke in light cream / olive / sage palette
  bgColor: string;
  waveStroke: string;
  // Conflict fracture properties
  isCracked: boolean;
  conflictDetails?: {
    id: string;
    label: string;
    summary: string;
  };
  details: string;
}

const WEAVE_PIPELINE_LAYERS: WeavePipelineLayer[] = [
  {
    id: 'layer-attestation',
    code: 'ATT-CORE-ED25519',
    title: 'Ed25519 Attestation & Tamper-Evident Ledger',
    roleScope: 'PLATFORM TRUST ANCHOR',
    testsCount: '12/12 checks passed',
    boundaryScore: '1.00',
    scoreStatus: 'ATTESTATION ACTIVE',
    scoreColor: '#3F5E4D',
    bgColor: '#EDF1E8', // Light sage cream
    waveStroke: '#85866B', // Muted olive
    isCracked: false,
    details: 'Platform root Ed25519 cryptographic key signs verified enrolment tokens (/verify/:token) and Merkle audit events.',
  },
  {
    id: 'layer-intake',
    code: 'AICTE-CAP-GOV',
    title: 'Approved Intake & Sanctioned Seat Thresholds',
    roleScope: 'REGULATOR OVERSIGHT',
    testsCount: '6/6 disciplines balanced',
    boundaryScore: '0.85',
    scoreStatus: 'CAPACITY HOLDING',
    scoreColor: '#85866B',
    bgColor: '#F2EFE6', // Warm cream
    waveStroke: '#C5AD82', // Champagne
    isCracked: false,
    details: 'Continuous monitoring of AICTE sanctioned seat caps (1,020 total seats) versus committed student enrolment across institutions.',
  },
  {
    id: 'layer-conflict',
    code: 'CNF-2026-019',
    title: 'Cross-Institution APAAR Digest Collision (STU-005)',
    roleScope: 'DUPLICATE REVIEW QUEUE',
    testsCount: '1 collision flagged',
    boundaryScore: '0.50',
    scoreStatus: '2 INSTITUTIONS HOLDING',
    scoreColor: '#9E3D35',
    bgColor: '#FAF0EE', // Soft warm coral-tinted cream
    waveStroke: '#C7756B', // Muted terra cotta
    isCracked: true,
    conflictDetails: {
      id: 'CONFLICT-2026-019',
      label: 'STU-005 COLLISION',
      summary: 'Candidate ref ****-8472 found on NIT Kurukshetra and IIET Delhi admission rosters.',
    },
    details: 'Irreversible APAAR SHA-256 hash collision detected between NIT Kurukshetra (BTECH-CSE) and IIET Delhi. Routed to human regulator queue.',
  },
  {
    id: 'layer-ruleset',
    code: 'RULESET-2026.10',
    title: 'Deterministic Academic Policy Engine (STU-001..004)',
    roleScope: 'DETERMINISTIC EVALUATION',
    testsCount: '4/4 rules evaluated',
    boundaryScore: '0.75',
    scoreStatus: 'POLICY VERIFIED',
    scoreColor: '#85866B',
    bgColor: '#F5F1E8', // Warm cream base
    waveStroke: '#A8B19A', // Soft sage
    isCracked: true,
    details: 'Deterministic checks for 12-digit APAAR format (STU-001), sanctioned program codes (STU-002), age window [16-35] (STU-003), and consent (STU-004).',
  },
  {
    id: 'layer-ingestion',
    code: 'BAT-2026-003',
    title: 'CSV Roster Preflight & Salted Masking Vault',
    roleScope: 'INSTITUTION TENANT GATEWAY',
    testsCount: '5/5 rows masked',
    boundaryScore: '0.90',
    scoreStatus: 'PREFLIGHT PASSED',
    scoreColor: '#3F5E4D',
    bgColor: '#EEF3EC', // Soft pale sage
    waveStroke: '#85866B', // Muted olive
    isCracked: false,
    details: 'Mandatory CSV header verification, immediate raw APAAR masking to ****-****-XXXX, and strict rejection of Aadhaar columns.',
  },
  {
    id: 'layer-tenants',
    code: 'TENANT-ISOLATION',
    title: 'Participating Technical Institutions Isolation Baseline',
    roleScope: 'TENANT BOUNDARY',
    testsCount: '3 colleges isolated',
    boundaryScore: '1.00',
    scoreStatus: 'ISOLATION HOLDING',
    scoreColor: '#3F5E4D',
    bgColor: '#F8F6F0', // Porcelain warm
    waveStroke: '#B7AA98', // Warm taupe
    isCracked: false,
    details: 'Row-level cryptographic multi-tenancy ensures colleges never view competing rosters or unauthorized student records.',
  },
];

export const LivePipelineStrata: React.FC = () => {
  // Phase 1: Preflight Baseline (Clean / Monochromatic)
  // Phase 2: Semantic Formula (Multi-Tiered Strata)
  // Phase 3: Conflict Fracture Break (Fault line split with CNF-2026-019 collision)
  const [phase, setPhase] = useState<StrataPhase>('fracture');
  const [selectedLayerId, setSelectedLayerId] = useState<string>('layer-conflict');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Automatic phase sequence: colorless -> color_formula -> fracture -> repeat
  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      setPhase((current) => {
        if (current === 'colorless') return 'color_formula';
        if (current === 'color_formula') return 'fracture';
        return 'colorless';
      });
    }, 4200);

    return () => window.clearInterval(interval);
  }, [isPlaying]);

  const selectedLayer =
    WEAVE_PIPELINE_LAYERS.find((l) => l.id === selectedLayerId) || WEAVE_PIPELINE_LAYERS[2];

  return (
    <div className="w-full bg-[#FFFDF8] text-[#302F29] rounded-xl overflow-hidden border border-[#E4DED2] shadow-sm flex flex-col">
      {/* Top Controller Bar */}
      <div className="px-5 py-3.5 bg-[#F5F1E8] border-b border-[#E4DED2] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] font-semibold tracking-wider uppercase text-[#85866B]">
            WEAVE Live Pipeline Strata · SIH26263
          </span>
          <div className="flex items-center p-0.5 bg-[#FFFDF8] border border-[#E4DED2] rounded-md">
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setPhase('colorless');
              }}
              className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors ${
                phase === 'colorless'
                  ? 'bg-[#302F29] text-[#FFFDF8] font-semibold'
                  : 'text-[#77746B] hover:text-[#302F29]'
              }`}
            >
              1. Preflight Baseline
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setPhase('color_formula');
              }}
              className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors ${
                phase === 'color_formula'
                  ? 'bg-[#302F29] text-[#FFFDF8] font-semibold'
                  : 'text-[#77746B] hover:text-[#302F29]'
              }`}
            >
              2. Semantic Strata
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setPhase('fracture');
              }}
              className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors ${
                phase === 'fracture'
                  ? 'bg-[#302F29] text-[#FFFDF8] font-semibold'
                  : 'text-[#77746B] hover:text-[#302F29]'
              }`}
            >
              3. Conflict Break
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono text-[#77746B] hover:text-[#302F29] bg-[#FFFDF8] border border-[#E4DED2] rounded hover:border-[#C5AD82] transition-colors"
            title={isPlaying ? 'Pause auto transition' : 'Resume auto transition'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3 text-[#85866B]" />
                <span>Cycling (4.2s)</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 text-[#85866B]" />
                <span>Paused</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setPhase('colorless');
              setIsPlaying(true);
            }}
            className="p-1 text-[#77746B] hover:text-[#302F29] bg-[#FFFDF8] border border-[#E4DED2] rounded"
            title="Reset to beginning"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Narrative Subtitle Explaining the Transition */}
      <div className="px-5 py-2.5 bg-[#FFFDF8] border-b border-[#E4DED2] text-xs text-[#77746B] flex items-center justify-between">
        <p className="line-clamp-1">
          {phase === 'colorless' &&
            'Step 1 · Preflight baseline: All institutional batches and integrity checks running in uniform alignment.'}
          {phase === 'color_formula' &&
            'Step 2 · Multi-layer semantic strata: Continuous boundary compliance scores and deterministic rule evaluations.'}
          {phase === 'fracture' &&
            'Step 3 · Cross-institution conflict break: Boundary score falls to 0.50, an overlap crack opens under the surface, and review follows.'}
        </p>
        <span className="font-mono text-[10px] text-[#85866B] shrink-0 ml-3">
          Select any stratum layer
        </span>
      </div>

      {/* Main Strata Diagram Container */}
      <div className="relative p-5 sm:p-6 bg-[#F5F1E8] flex-1 overflow-hidden select-none">
        {/* Jagged Fracture SVG Crack (Visible during Phase 3 'fracture') */}
        {phase === 'fracture' && (
          <div className="absolute inset-y-6 left-1/2 -translate-x-1/2 w-16 pointer-events-none z-30 transition-opacity duration-700 ease-in-out opacity-100">
            <svg
              viewBox="0 0 60 400"
              preserveAspectRatio="none"
              className="w-full h-full stroke-[#C7756B] fill-none"
              style={{ filter: 'drop-shadow(0 0 4px rgba(199, 117, 107, 0.35))' }}
            >
              {/* Jagged crack path slicing down through the strata */}
              <path
                d="M30 40 L22 80 L36 115 L18 150 L34 185 L20 225 L38 260 L24 295 L32 335 L26 370"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Secondary micro-fractures */}
              <path
                d="M22 80 L14 95 M36 115 L44 130 M34 185 L42 200 M20 225 L12 240 M38 260 L46 272"
                strokeWidth="1.2"
                strokeDasharray="2 3"
              />
            </svg>
          </div>
        )}

        {/* Stacked Wavy Strata Layers */}
        <div className="space-y-2 relative z-10">
          {WEAVE_PIPELINE_LAYERS.map((layer, idx) => {
            const isSelected = selectedLayerId === layer.id;
            const isColorFormula = phase === 'color_formula' || phase === 'fracture';
            const isFractured = phase === 'fracture' && layer.isCracked;

            // Background & Border styling depending on phase
            const currentBg =
              phase === 'colorless'
                ? isSelected
                  ? '#FFFFFF'
                  : '#FAF8F3'
                : layer.bgColor;

            const currentBorder =
              isSelected
                ? '#302F29'
                : phase === 'colorless'
                ? '#E4DED2'
                : layer.waveStroke;

            return (
              <div
                key={layer.id}
                onClick={() => setSelectedLayerId(layer.id)}
                className={`group relative rounded-lg p-3.5 transition-all duration-500 cursor-pointer overflow-hidden ${
                  isSelected ? 'ring-2 ring-[#302F29] shadow-md' : 'hover:shadow-sm'
                }`}
                style={{
                  backgroundColor: currentBg,
                  border: `1.5px solid ${currentBorder}`,
                }}
              >
                {/* Subtle Wavy Topographical SVG Curve on colored phases */}
                {isColorFormula && (
                  <div className="absolute inset-0 pointer-events-none opacity-40 overflow-hidden">
                    <svg
                      viewBox="0 0 1000 80"
                      preserveAspectRatio="none"
                      className="w-full h-full fill-none"
                    >
                      <path
                        d={
                          idx % 2 === 0
                            ? 'M0 20 Q 250 5, 500 20 T 1000 20'
                            : 'M0 25 Q 250 40, 500 25 T 1000 25'
                        }
                        stroke={layer.waveStroke}
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>
                )}

                <div className="relative z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Layer Code, Role, and Real WEAVE Title */}
                  <div className="space-y-0.5 max-w-lg">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[#77746B]">
                        {layer.code}
                      </span>
                      <span className="text-[10px] font-mono text-[#85866B] font-semibold">
                        · {layer.roleScope}
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-[#302F29] leading-snug">
                      {layer.title}
                    </div>
                  </div>

                  {/* Right: State / Metrics / Tests */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Phase 1: Pure Test Checksum Status */}
                    {phase === 'colorless' && (
                      <div className="flex items-center gap-1.5 font-mono text-xs text-[#302F29] bg-[#FFFDF8] px-3 py-1 rounded border border-[#E4DED2]">
                        <Check className="w-3.5 h-3.5 text-[#3F5E4D]" />
                        <span>{layer.testsCount}</span>
                      </div>
                    )}

                    {/* Phase 2: Colored Formula Boundary Score */}
                    {phase === 'color_formula' && (
                      <div className="flex items-center gap-2 font-mono text-xs bg-[#FFFDF8]/90 px-3 py-1 rounded border border-[#E4DED2] shadow-2xs">
                        <span className="font-bold tabular-nums" style={{ color: layer.scoreColor }}>
                          {layer.boundaryScore}
                        </span>
                        <span className="text-[10px] tracking-wider uppercase text-[#77746B]">
                          {layer.scoreStatus}
                        </span>
                      </div>
                    )}

                    {/* Phase 3: Fracture with Conflict Event Indicator */}
                    {phase === 'fracture' && (
                      <div className="flex items-center gap-2">
                        {isFractured && layer.conflictDetails && (
                          <div className="animate-pulse flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#9E3D35] text-[#FFFDF8] font-mono text-[10px] font-bold shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FFFDF8]" />
                            <span>{layer.conflictDetails.id}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 font-mono text-xs bg-[#FFFDF8]/95 px-3 py-1 rounded border border-[#E4DED2]">
                          <span
                            className="font-bold tabular-nums"
                            style={{ color: isFractured ? '#9E3D35' : layer.scoreColor }}
                          >
                            {isFractured ? '0.50' : layer.boundaryScore}
                          </span>
                          <span className="text-[10px] tracking-wider uppercase text-[#77746B]">
                            {isFractured ? 'REVIEW QUEUED' : layer.scoreStatus}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Layer Operational Telemetry Inspection Footer */}
      <div className="p-4 sm:p-5 bg-[#FBF9F4] border-t border-[#E4DED2] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-semibold text-[#85866B]">
              {selectedLayer.code} · {selectedLayer.title}
            </span>
            {selectedLayer.isCracked && phase === 'fracture' && (
              <span className="px-1.5 py-0.5 rounded bg-[#9E3D35]/10 text-[#9E3D35] font-mono text-[10px] font-bold">
                CONFLICT ACTIVE
              </span>
            )}
          </div>
          <p className="text-[#77746B] leading-relaxed max-w-2xl">{selectedLayer.details}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
          <span className="text-[#77746B]">Score:</span>
          <span
            className="font-bold px-2 py-0.5 rounded bg-[#FFFDF8] border border-[#E4DED2]"
            style={{ color: selectedLayer.scoreColor }}
          >
            {selectedLayer.boundaryScore} ({selectedLayer.scoreStatus})
          </span>
        </div>
      </div>
    </div>
  );
};
