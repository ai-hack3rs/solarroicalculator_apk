// src/App.jsx — SolarBharat Calculator: Complete Professional Build
import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';
import { CONSTANTS, calculatePSH, calculateSubsidy, formatINR } from './constants';
import { Capacitor } from '@capacitor/core';
import { Printer } from '@capgo/capacitor-printer';

// ── Fix Leaflet default icon paths ────────────────────────────────
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ── Custom sunny marker icon ───────────────────────────────────────
const solarIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:36px;height:36px;border-radius:50%;
    background:linear-gradient(135deg,#f59e0b,#fbbf24);
    border:3px solid #fff;
    box-shadow:0 0 12px rgba(251,191,36,0.7),0 2px 6px rgba(0,0,0,0.3);
    display:flex;align-items:center;justify-content:center;
    font-size:16px;
  ">☀️</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// ── Location Picker Component ──────────────────────────────────────
function LocationPicker({ onLocationChange, position }) {
  const map = useMapEvents({
    click(e) {
      onLocationChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  useEffect(() => {
    const provider = new OpenStreetMapProvider();
    const searchControl = new GeoSearchControl({
      provider,
      style: 'bar',
      showMarker: false,
      showPopup: false,
      retainZoomLevel: false,
      animateZoom: true,
      autoClose: true,
      keepResult: true,
      searchLabel: 'Search city or address in India...',
    });
    map.addControl(searchControl);
    map.on('geosearch/showlocation', (e) => {
      onLocationChange({ lat: e.location.y, lng: e.location.x });
    });
    return () => {
      map.removeControl(searchControl);
    };
  }, [map, onLocationChange]);

  return <Marker position={[position.lat, position.lng]} icon={solarIcon} />;
}

// ── SVG Financial Chart Component ─────────────────────────────────
function FinancialChart({ cumulativeCost, cumulativeReturns, breakEvenYear, batteryReplacementYears }) {
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef(null);

  const W = 560;
  const H = 300;
  const padL = 70;
  const padR = 20;
  const padT = 20;
  const padB = 50;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const years = 25;

  if (!cumulativeCost.length || !cumulativeReturns.length) return null;

  const maxVal = Math.max(
    Math.max(...cumulativeCost),
    Math.max(...cumulativeReturns),
    1
  );

  const xOf = (yr) => padL + (yr / years) * chartW;
  const yOf = (val) => padT + chartH - (val / maxVal) * chartH;

  const costPoints = cumulativeCost.map((c, i) => `${xOf(i + 1)},${yOf(c)}`).join(' ');
  const retPoints = cumulativeReturns.map((r, i) => `${xOf(i + 1)},${yOf(r)}`).join(' ');

  // Generate Y-axis ticks
  const yTicks = [];
  for (let i = 0; i <= 5; i++) {
    const val = (maxVal / 5) * i;
    const y = yOf(val);
    yTicks.push({ val, y });
  }

  // X-axis ticks
  const xTicks = [0, 5, 10, 15, 20, 25];

  const handleMouseMove = (e) => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const dataX = svgX - padL;
    if (dataX < 0 || dataX > chartW) { setTooltip(null); return; }
    const yearIdx = Math.round((dataX / chartW) * years);
    if (yearIdx < 1 || yearIdx > years) { setTooltip(null); return; }
    const cost = cumulativeCost[yearIdx - 1] || 0;
    const ret = cumulativeReturns[yearIdx - 1] || 0;
    setTooltip({
      year: yearIdx,
      cost,
      ret,
      x: xOf(yearIdx),
      y: Math.min(yOf(cost), yOf(ret)) - 10,
    });
  };

  return (
    <div className="relative" style={{ fontFamily: 'Inter, sans-serif' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: '280px' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Background grid */}
        <defs>
          <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
          </linearGradient>
          <clipPath id="chartClip">
            <rect x={padL} y={padT} width={chartW} height={chartH} />
          </clipPath>
        </defs>

        {/* Grid lines */}
        {yTicks.map(({ y }, idx) => (
          <line
            key={idx}
            x1={padL} y1={y} x2={W - padR} y2={y}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="4,4"
            strokeWidth="1"
          />
        ))}
        {xTicks.map(yr => (
          <line
            key={yr}
            x1={xOf(yr)} y1={padT} x2={xOf(yr)} y2={padT + chartH}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        ))}

        {/* Axes */}
        <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
        <line x1={padL} y1={padT + chartH} x2={W - padR} y2={padT + chartH} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />

        {/* Y-axis labels */}
        {yTicks.map(({ val, y }, idx) => (
          <text key={idx} x={padL - 6} y={y + 4} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.45)">
            {formatINR(val)}
          </text>
        ))}

        {/* X-axis labels */}
        {xTicks.map(yr => (
          <text key={yr} x={xOf(yr)} y={padT + chartH + 16} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.45)">
            {yr === 0 ? '' : `Y${yr}`}
          </text>
        ))}
        <text x={padL + chartW / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.35)">
          Year
        </text>

        {/* Area fills (clipped) */}
        <clipPath id="chartAreaClip">
          <rect x={padL} y={padT} width={chartW} height={chartH} />
        </clipPath>

        <polygon
          clipPath="url(#chartAreaClip)"
          fill="url(#costGrad)"
          points={`${padL},${padT + chartH} ${costPoints} ${xOf(years)},${padT + chartH}`}
        />
        <polygon
          clipPath="url(#chartAreaClip)"
          fill="url(#retGrad)"
          points={`${padL},${padT + chartH} ${retPoints} ${xOf(years)},${padT + chartH}`}
        />

        {/* Battery replacement vertical lines */}
        {batteryReplacementYears.map(yr => (
          <line
            key={yr}
            x1={xOf(yr)} y1={padT} x2={xOf(yr)} y2={padT + chartH}
            stroke="rgba(251,191,36,0.5)"
            strokeWidth="1.5"
            strokeDasharray="5,3"
          />
        ))}

        {/* Cost line */}
        <polyline
          clipPath="url(#chartAreaClip)"
          fill="none"
          stroke="#ef4444"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={costPoints}
        />

        {/* Returns line */}
        <polyline
          clipPath="url(#chartAreaClip)"
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={retPoints}
        />

        {/* Break-even point */}
        {breakEvenYear && breakEvenYear <= years && (
          <g>
            <circle
              cx={xOf(breakEvenYear)}
              cy={yOf(cumulativeCost[breakEvenYear - 1])}
              r="7"
              fill="#fbbf24"
              stroke="#fff"
              strokeWidth="2"
              filter="url(#glow)"
            />
            <text
              x={xOf(breakEvenYear) + 10}
              y={yOf(cumulativeCost[breakEvenYear - 1]) - 8}
              fontSize="10"
              fontWeight="700"
              fill="#fbbf24"
            >
              ✓ Break-Even Y{breakEvenYear}
            </text>
          </g>
        )}

        {/* Hover crosshair */}
        {tooltip && (
          <g>
            <line
              x1={tooltip.x} y1={padT}
              x2={tooltip.x} y2={padT + chartH}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <circle cx={tooltip.x} cy={yOf(tooltip.cost)} r="4" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
            <circle cx={tooltip.x} cy={yOf(tooltip.ret)} r="4" fill="#10b981" stroke="#fff" strokeWidth="1.5" />
          </g>
        )}

        {/* Legend */}
        <rect x={padL + 8} y={padT + 8} width="10" height="3" rx="1.5" fill="#ef4444" />
        <text x={padL + 22} y={padT + 12} fontSize="10" fill="rgba(255,255,255,0.7)">Cumulative Cost</text>
        <rect x={padL + 110} y={padT + 8} width="10" height="3" rx="1.5" fill="#10b981" />
        <text x={padL + 124} y={padT + 12} fontSize="10" fill="rgba(255,255,255,0.7)">Cumulative Returns</text>
        <rect x={padL + 240} y={padT + 6} width="8" height="8" rx="1" fill="rgba(251,191,36,0.4)" stroke="#fbbf24" strokeWidth="1" />
        <text x={padL + 252} y={padT + 12} fontSize="10" fill="rgba(251,191,36,0.8)">Battery Replace</text>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="chart-tooltip"
          style={{
            left: `${(tooltip.x / W) * 100}%`,
            top: `${(tooltip.y / H) * 100}%`,
          }}
        >
          <div style={{ color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>Year {tooltip.year}</div>
          <div style={{ color: '#f87171' }}>Cost: {formatINR(tooltip.cost, false)}</div>
          <div style={{ color: '#34d399' }}>Returns: {formatINR(tooltip.ret, false)}</div>
          <div style={{ color: tooltip.ret >= tooltip.cost ? '#fbbf24' : '#64748b', marginTop: '4px', fontSize: '11px' }}>
            {tooltip.ret >= tooltip.cost
              ? `Profit: ${formatINR(tooltip.ret - tooltip.cost, false)}`
              : `Deficit: ${formatINR(tooltip.cost - tooltip.ret, false)}`}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Input Field Helper ─────────────────────────────────────────────
function Field({ label, hint, children }) {
  return (
    <div className="mb-4">
      <label className="form-label">{label}</label>
      {children}
      {hint && <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>{hint}</p>}
    </div>
  );
}

// ── Section Header Helper ──────────────────────────────────────────
function SectionHeader({ icon, title, badge }) {
  return (
    <div className="section-header">
      <div className="section-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>{icon}</div>
      <div>
        <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#e2e8f0', fontFamily: 'Space Grotesk, sans-serif' }}>{title}</h2>
      </div>
      {badge && <div style={{ marginLeft: 'auto' }}>{badge}</div>}
    </div>
  );
}

// ── Stat Display Card ──────────────────────────────────────────────
function StatDisplay({ label, value, sub, color = '#f1f5f9', highlight }) {
  return (
    <div className="stat-card" style={highlight ? { borderColor: `${color}30`, background: `${color}08` } : {}}>
      <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '1.15rem', fontWeight: 700, color, fontFamily: 'Space Grotesk, sans-serif' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '3px' }}>{sub}</div>}
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────
function App() {
  // ─ Input States ─────────────────────────────────────────────────
  const [systemType, setSystemType] = useState('On-Grid');
  const [systemSize, setSystemSize] = useState(5);
  const [dailyConsumption, setDailyConsumption] = useState(20);
  const [dayUsagePct, setDayUsagePct] = useState(70);
  const [location, setLocation] = useState({ lat: 23.022505, lng: 72.571362 }); // Ahmedabad default (high solar)
  const [locationName, setLocationName] = useState('Ahmedabad, Gujarat');
  const [gridRate, setGridRate] = useState(8);
  const [installCost, setInstallCost] = useState(15000);
  const [panelDegradation, setPanelDegradation] = useState(0.5);
  const [voltage, setVoltage] = useState(48);
  const [batteryType, setBatteryType] = useState('LiFePO4');
  const [batteryCapacity, setBatteryCapacity] = useState(10);
  const [hybridStrategy, setHybridStrategy] = useState('Max Savings');
  const [systemLosses, setSystemLosses] = useState(14);

  // ─ Computed / Overridable States ─────────────────────────────────
  const [overrideCost, setOverrideCost] = useState(null);
  const [overrideSubsidy, setOverrideSubsidy] = useState(null);

  // ─ Results ───────────────────────────────────────────────────────
  const [results, setResults] = useState(null);

  const psh = calculatePSH(location.lat);
  const batterySpec = CONSTANTS.batteries[batteryType];

  const handleLocationChange = useCallback((loc) => {
    setLocation(loc);
  }, []);

  // ─ Core Calculation Engine ────────────────────────────────────────
  useEffect(() => {
    // Panel cost
    const panelPrice = systemType === 'On-Grid' ? CONSTANTS.panels.DCR : CONSTANTS.panels.NonDCR;
    const panelCost = systemSize * 1000 * panelPrice;

    // Inverter cost
    let invKey = 'GridTie';
    if (systemType === 'Hybrid') invKey = 'Hybrid';
    else if (systemType === 'Off-Grid') invKey = 'OffGrid';
    const inverterCost = systemSize * 1000 * CONSTANTS.inverters[invKey] / 1000; // ₹/W → ₹
    const inverterCostW = systemSize * CONSTANTS.inverters[invKey] * 1000 / 1000; // properly: kW*1000W/kW*₹/W

    // Battery cost (only for hybrid & off-grid)
    const hasBattery = systemType !== 'On-Grid';
    const actualBatteryCap = hasBattery ? batteryCapacity : 0;
    const batteryCost = actualBatteryCap * batterySpec.pricePerKWh;

    // Total estimated cost
    const estPanelInvCost = panelCost + systemSize * CONSTANTS.inverters[invKey];
    const estTotalCost = estPanelInvCost + batteryCost + installCost;

    const totalSystemCost = overrideCost !== null ? overrideCost : estTotalCost;

    // Subsidy
    const estSubsidy = calculateSubsidy(systemSize, systemType, panelCost);
    const subsidy = overrideSubsidy !== null ? overrideSubsidy : estSubsidy;
    const netInvestment = totalSystemCost - subsidy;

    // Energy generation
    const efficiencyFactor = (1 - systemLosses / 100);
    const annualGenBase = systemSize * psh * 365 * efficiencyFactor; // kWh/yr

    // Battery replacement schedule
    const calLife = batterySpec.calendarLife;
    const batteryReplacementYears = [];
    if (hasBattery) {
      for (let y = calLife; y <= 25; y += calLife) {
        batteryReplacementYears.push(y);
      }
    }

    // 25-year projection
    const cumulativeCost = [];
    const cumulativeReturns = [];
    let costSoFar = netInvestment;
    let returnsSoFar = 0;
    let annualBattCosts = 0;
    let breakEvenYear = null;

    for (let y = 1; y <= 25; y++) {
      // Battery replacement
      const isBattReplace = hasBattery && y % calLife === 0 && y !== 0;
      if (isBattReplace) {
        costSoFar += batteryCost;
        annualBattCosts += batteryCost;
      }

      // Panel degradation
      const degradedGen = annualGenBase * Math.pow(1 - panelDegradation / 100, y - 1);

      // Off-grid: only save what you'd consume, limited by battery DoD
      // Grid-tied: can export all excess generation
      let yearlySaving;
      if (systemType === 'Off-Grid') {
        const effectiveDailyStorage = actualBatteryCap * batterySpec.DoD;
        const nightCons = dailyConsumption * (1 - dayUsagePct / 100);
        const nightCovered = Math.min(nightCons, effectiveDailyStorage);
        const dayCons = dailyConsumption * (dayUsagePct / 100);
        const dayGen = Math.min(degradedGen / 365, dayCons);
        yearlySaving = (dayGen + nightCovered) * 365 * gridRate;
      } else if (systemType === 'Hybrid') {
        const selfConsumption = Math.min(degradedGen, dailyConsumption * 365);
        const export_ = Math.max(0, degradedGen - dailyConsumption * 365);
        const exportRate = hybridStrategy === 'Max Savings' ? gridRate * 0.9 : gridRate * 0.5;
        yearlySaving = selfConsumption * gridRate + export_ * exportRate;
      } else {
        // On-grid: all generation offsets consumption or exported
        yearlySaving = Math.min(degradedGen, dailyConsumption * 365) * gridRate;
      }

      returnsSoFar += yearlySaving;
      costSoFar += (y > 1 ? 0 : 0); // O&M: included in base estimate
      cumulativeCost.push(costSoFar);
      cumulativeReturns.push(returnsSoFar);

      if (breakEvenYear === null && returnsSoFar >= costSoFar) {
        breakEvenYear = y;
      }
    }

    const lifetimeSavings = cumulativeReturns[24] - cumulativeCost[24];
    const finalAnnualGen = annualGenBase * Math.pow(1 - panelDegradation / 100, 24);
    const selfSufficiency = Math.min(100, (annualGenBase / (dailyConsumption * 365)) * 100);
    const dcYield = systemSize * psh * 365;
    const acOutput = dcYield * efficiencyFactor;
    const unmetLoad = Math.max(0, dailyConsumption * 365 - acOutput);

    setResults({
      totalSystemCost,
      subsidy,
      netInvestment,
      lifetimeSavings,
      breakEvenYear,
      annualBattCosts,
      batteryReplacementYears,
      cumulativeCost,
      cumulativeReturns,
      dcYield,
      acOutput,
      selfSufficiency,
      unmetLoad,
      annualGenBase,
      estTotalCost,
      estSubsidy,
    });
  }, [
    systemType, systemSize, dailyConsumption, dayUsagePct,
    location, gridRate, installCost, panelDegradation,
    voltage, batteryType, batteryCapacity, hybridStrategy,
    systemLosses, psh, overrideCost, overrideSubsidy,
    batterySpec, hybridStrategy,
  ]);

  // Init overrides when estimates change
  useEffect(() => {
    if (results) {
      if (overrideCost === null) { /* keep null to use estimated */ }
    }
  }, [results]);

  const displayCost = overrideCost !== null ? overrideCost : (results?.estTotalCost ?? 0);
  const displaySubsidy = overrideSubsidy !== null ? overrideSubsidy : (results?.estSubsidy ?? 0);

  const hasBattery = systemType !== 'On-Grid';

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ─── Hero Header ─────────────────────────────────────────── */}
      <header style={{
        padding: '2rem 2rem 1rem',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.2)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }} className="no-print">
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', boxShadow: '0 4px 16px rgba(251,191,36,0.4)',
            }}>☀️</div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Space Grotesk, sans-serif' }}>
                <span className="gradient-text">SolarBharat</span>
                <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '1.1rem' }}> Calculator</span>
              </h1>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Professional Lifetime ROI Analyzer · India 2025</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div className="psh-pill">
              ☀️ PSH: {psh.toFixed(1)} hrs/day
            </div>
            <button
              className="btn-primary"
              onClick={async () => {
                if (Capacitor.isNativePlatform()) {
                  await Printer.printWebView();
                } else {
                  window.print();
                }
              }}
              id="btn-print"
            >
              <span>🖨️</span> Print / Save PDF
            </button>
          </div>
        </div>
      </header>

      {/* Print-only header */}
      <div className="print-only" style={{ display: 'none', padding: '0 0 12px 0', borderBottom: '2px solid #312e81', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#0f172a', margin: '0 0 4px', fontSize: '20px' }}>☀️ SolarBharat Calculator — ROI Report</h1>
            <p style={{ color: '#475569', margin: 0, fontSize: '11px' }}>Generated: {new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '10px', color: '#64748b' }}>
            <div>Peak Sun Hours: <strong style={{ color: '#0f172a' }}>{psh.toFixed(1)} hrs/day</strong></div>
            <div>Lat: {location.lat.toFixed(4)}° · Lng: {location.lng.toFixed(4)}°</div>
          </div>
        </div>

        {/* Print-only config summary table */}
        <div style={{ marginTop: '14px' }}>
          <h2 style={{ fontSize: '12px', color: '#1e3a8a', marginBottom: '6px', fontFamily: 'Inter, sans-serif' }}>⚙️ System Configuration</h2>
          <table className="print-summary-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Value</th>
                <th>Parameter</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>System Type</td>
                <td><strong>{systemType}</strong></td>
                <td>System Size</td>
                <td><strong>{systemSize} kW</strong></td>
              </tr>
              <tr>
                <td>Daily Consumption</td>
                <td><strong>{dailyConsumption} kWh/day</strong></td>
                <td>Day-time Usage</td>
                <td><strong>{dayUsagePct}%</strong></td>
              </tr>
              <tr>
                <td>Grid Rate</td>
                <td><strong>₹{gridRate}/kWh</strong></td>
                <td>Installation Cost</td>
                <td><strong>₹{installCost.toLocaleString('en-IN')}</strong></td>
              </tr>
              <tr>
                <td>Panel Degradation</td>
                <td><strong>{panelDegradation}%/yr</strong></td>
                <td>System Losses</td>
                <td><strong>{systemLosses}%</strong></td>
              </tr>
              <tr>
                <td>DC Bus Voltage</td>
                <td><strong>{voltage}V</strong></td>
                <td>Battery Type</td>
                <td><strong>{hasBattery ? batteryType : 'N/A (On-Grid)'}</strong></td>
              </tr>
              {hasBattery && (
                <tr>
                  <td>Battery Capacity</td>
                  <td><strong>{batteryCapacity} kWh (usable: {(batteryCapacity * batterySpec.DoD).toFixed(1)} kWh)</strong></td>
                  <td>Hybrid Strategy</td>
                  <td><strong>{systemType === 'Hybrid' ? hybridStrategy : 'N/A'}</strong></td>
                </tr>
              )}
              <tr>
                <td>Location (Lat/Lng)</td>
                <td><strong>{location.lat.toFixed(4)}°N, {location.lng.toFixed(4)}°E</strong></td>
                <td>Peak Sun Hours</td>
                <td><strong>{psh.toFixed(1)} hrs/day</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {/* ─── STEP 1: Inputs ─────────────────────────────────────── */}
        <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 800, color: 'white',
          }}>1</div>
          <h2 style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            System Configuration
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>

          {/* Card 1: System & Usage */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <SectionHeader icon="⚡" title="System & Usage" />

            <Field label="System Type">
              <select
                className="solar-input"
                value={systemType}
                onChange={e => setSystemType(e.target.value)}
                id="sel-system-type"
              >
                <option value="On-Grid">On-Grid (Grid-Tied)</option>
                <option value="Off-Grid">Off-Grid (Standalone)</option>
                <option value="Hybrid">Hybrid (Grid + Battery)</option>
              </select>
            </Field>

            <Field label="System Size (kW)" hint="Typical residential: 1–10 kW">
              <input
                type="number" min="0.5" max="100" step="0.5"
                className="solar-input"
                value={systemSize}
                onChange={e => setSystemSize(Math.max(0.5, +e.target.value))}
                id="inp-system-size"
              />
            </Field>

            <Field label="Daily Consumption (kWh)" hint="Check your electricity bill">
              <input
                type="number" min="1" max="500" step="0.5"
                className="solar-input"
                value={dailyConsumption}
                onChange={e => setDailyConsumption(Math.max(1, +e.target.value))}
                id="inp-daily-consumption"
              />
            </Field>

            <Field label="Day-time Usage %" hint="What % of load runs during daylight hours">
              <div className="range-row" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="range" min="10" max="100" step="5"
                  style={{ flex: 1, accentColor: '#6366f1' }}
                  value={dayUsagePct}
                  onChange={e => setDayUsagePct(+e.target.value)}
                />
                <span className="range-value" style={{ minWidth: '40px', textAlign: 'right', color: '#818cf8', fontWeight: 700 }}>{dayUsagePct}%</span>
              </div>
            </Field>

            <div className="section-divider" />

            <Field label="System Losses (%)" hint="Combined MPPT, inverter, wiring & soiling losses">
              <div className="range-row" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="range" min="5" max="30" step="1"
                  style={{ flex: 1, accentColor: '#f59e0b' }}
                  value={systemLosses}
                  onChange={e => setSystemLosses(+e.target.value)}
                />
                <span className="range-value" style={{ minWidth: '40px', textAlign: 'right', color: '#fbbf24', fontWeight: 700 }}>{systemLosses}%</span>
              </div>
            </Field>

            <Field label="Panel Degradation (%/year)" hint="Typical silicon panels: 0.4–0.7%/yr">
              <input
                type="number" min="0.1" max="2" step="0.1"
                className="solar-input"
                value={panelDegradation}
                onChange={e => setPanelDegradation(+e.target.value)}
                id="inp-degradation"
              />
            </Field>
          </div>

          {/* Card 2: Location & Financials */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <SectionHeader
              icon="📍"
              title="Location & Financials"
              badge={<span className="badge badge-yellow">☀️ PSH {psh.toFixed(1)}</span>}
            />

            <Field label="Location — Click map or search">
              <div className="map-wrapper" style={{ height: '200px' }}>
                <MapContainer
                  center={[location.lat, location.lng]}
                  zoom={5}
                  style={{ height: '100%', width: '100%' }}
                  id="solar-map"
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  <LocationPicker
                    position={location}
                    onLocationChange={handleLocationChange}
                  />
                </MapContainer>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.72rem', color: '#64748b' }}>
                <span>Lat: {location.lat.toFixed(4)}° · Lng: {location.lng.toFixed(4)}°</span>
                <span>Peak Sun Hours: <strong style={{ color: '#fbbf24' }}>{psh.toFixed(1)} hrs/day</strong></span>
              </div>
            </Field>

            <Field label="Grid Rate (₹/kWh)" hint="Your current electricity tariff">
              <input
                type="number" min="1" max="20" step="0.5"
                className="solar-input"
                value={gridRate}
                onChange={e => setGridRate(+e.target.value)}
                id="inp-grid-rate"
              />
            </Field>

            <Field label="Installation & BOS Cost (₹)" hint="Balance of system: mounting, cables, civil work">
              <input
                type="number" min="0" step="1000"
                className="solar-input"
                value={installCost}
                onChange={e => setInstallCost(+e.target.value)}
                id="inp-install-cost"
              />
            </Field>
          </div>

          {/* Card 3: Tech Specs */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <SectionHeader icon="🔋" title="Tech Specs" />

            <Field label="DC Bus Voltage (V)">
              <select
                className="solar-input"
                value={voltage}
                onChange={e => setVoltage(+e.target.value)}
                id="sel-voltage"
              >
                <option value={12}>12V</option>
                <option value={24}>24V</option>
                <option value={48}>48V (Recommended)</option>
                <option value={96}>96V</option>
              </select>
            </Field>

            <Field label="Battery Type" hint={hasBattery ? '' : 'Not applicable for On-Grid'}>
              <select
                className="solar-input"
                value={batteryType}
                onChange={e => setBatteryType(e.target.value)}
                disabled={!hasBattery}
                id="sel-battery-type"
                style={{ opacity: hasBattery ? 1 : 0.5 }}
              >
                <option value="LiFePO4">LiFePO4 (Recommended)</option>
                <option value="LeadAcid">Lead Acid (VRLA)</option>
              </select>
            </Field>

            {hasBattery && (
              <Field label="Battery Bank Capacity (kWh)" hint={`Usable: ${(batteryCapacity * batterySpec.DoD).toFixed(1)} kWh @ ${batterySpec.DoD * 100}% DoD`}>
                <input
                  type="number" min="1" max="500" step="1"
                  className="solar-input"
                  value={batteryCapacity}
                  onChange={e => setBatteryCapacity(Math.max(1, +e.target.value))}
                  id="inp-battery-capacity"
                />
              </Field>
            )}

            {systemType === 'Hybrid' && (
              <Field label="Hybrid Strategy" hint="Max Savings exports excess; Backup Priority stores more">
                <select
                  className="solar-input"
                  value={hybridStrategy}
                  onChange={e => setHybridStrategy(e.target.value)}
                  id="sel-hybrid-strategy"
                >
                  <option value="Max Savings">Max Savings (Export Priority)</option>
                  <option value="Backup Priority">Backup Priority (Store Priority)</option>
                </select>
              </Field>
            )}

            {hasBattery && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem', padding: '0.875rem', marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Battery Life Estimate</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Calendar Life</div>
                    <div style={{ color: '#a5b4fc', fontWeight: 700 }}>{batterySpec.calendarLife} yrs</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Cycle Count</div>
                    <div style={{ color: '#a5b4fc', fontWeight: 700 }}>{batterySpec.cycles.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Depth of Discharge</div>
                    <div style={{ color: '#34d399', fontWeight: 700 }}>{batterySpec.DoD * 100}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Round-trip Eff.</div>
                    <div style={{ color: '#34d399', fontWeight: 700 }}>{((batterySpec.efficiency || 0.95) * 100).toFixed(0)}%</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── STEP 2: Results ─────────────────────────────────────── */}
        {results && (
          <>
            <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 800, color: 'white',
              }}>2</div>
              <h2 style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Analysis & Results
              </h2>
            </div>

            {/* Financial Report */}
            <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '1.25rem' }}>
              <SectionHeader
                icon="💰"
                title="Lifetime Financial Report"
                badge={
                  results.breakEvenYear
                    ? <span className="badge badge-green">✓ ROI in {results.breakEvenYear} years</span>
                    : <span className="badge badge-red">⚠ No break-even in 25 yrs</span>
                }
              />

              {/* Editable Cost + Subsidy */}
              <div style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', fontWeight: 600 }}>
                  ✏️ Override Estimates (editable)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label" style={{ color: '#818cf8' }}>Total System Cost (₹)</label>
                    <input
                      type="number"
                      className="result-editable"
                      value={displayCost}
                      onChange={e => setOverrideCost(+e.target.value)}
                      id="inp-override-cost"
                    />
                    <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '4px' }}>
                      Estimated: {formatINR(results.estTotalCost, false)}
                      {overrideCost !== null && <button
                        onClick={() => setOverrideCost(null)}
                        style={{ marginLeft: '8px', color: '#818cf8', cursor: 'pointer', background: 'none', border: 'none', fontSize: '0.7rem', textDecoration: 'underline' }}
                      >reset</button>}
                    </div>
                  </div>
                  <div>
                    <label className="form-label" style={{ color: '#818cf8' }}>Applicable Subsidy (₹)
                      {systemType === 'Off-Grid' && <span style={{ color: '#ef4444', marginLeft: '6px' }}>N/A for Off-Grid</span>}
                    </label>
                    <input
                      type="number"
                      className="result-editable"
                      value={displaySubsidy}
                      onChange={e => setOverrideSubsidy(+e.target.value)}
                      disabled={systemType === 'Off-Grid'}
                      style={{ opacity: systemType === 'Off-Grid' ? 0.5 : 1 }}
                      id="inp-override-subsidy"
                    />
                    <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '4px' }}>
                      PM Surya Ghar est: {formatINR(results.estSubsidy, false)}
                      {overrideSubsidy !== null && <button
                        onClick={() => setOverrideSubsidy(null)}
                        style={{ marginLeft: '8px', color: '#818cf8', cursor: 'pointer', background: 'none', border: 'none', fontSize: '0.7rem', textDecoration: 'underline' }}
                      >reset</button>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Stat Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.875rem' }}>
                <StatDisplay
                  label="Net Investment"
                  value={formatINR(results.netInvestment)}
                  sub={formatINR(results.netInvestment, false)}
                  color="#f87171"
                />
                <StatDisplay
                  label="25-Year Gross Returns"
                  value={formatINR(results.cumulativeReturns[24])}
                  sub={formatINR(results.cumulativeReturns[24], false)}
                  color="#34d399"
                />
                <StatDisplay
                  label="Net Lifetime Profit"
                  value={formatINR(results.lifetimeSavings)}
                  sub={results.lifetimeSavings > 0 ? 'Positive ROI ✓' : 'Negative ROI ✗'}
                  color={results.lifetimeSavings > 0 ? '#34d399' : '#ef4444'}
                  highlight={true}
                />
                <StatDisplay
                  label="Break-Even Point"
                  value={results.breakEvenYear ? `Year ${results.breakEvenYear}` : 'Outside 25 yrs'}
                  sub={results.breakEvenYear ? `${25 - results.breakEvenYear} yrs of pure profit` : 'Reduce costs or increase load'}
                  color={results.breakEvenYear ? '#fbbf24' : '#f87171'}
                  highlight={true}
                />
                {hasBattery && (
                  <StatDisplay
                    label="Battery Replacement Cost"
                    value={formatINR(results.annualBattCosts)}
                    sub={`${results.batteryReplacementYears.length} replacement(s) over 25 yrs`}
                    color="#f59e0b"
                  />
                )}
                <StatDisplay
                  label="Annual Return (Year 1)"
                  value={formatINR(results.cumulativeReturns[0])}
                  sub={`≈ ${formatINR(results.cumulativeReturns[0] / 12)}/month`}
                  color="#a5b4fc"
                />
              </div>
            </div>

            {/* Daily Energy Balance */}
            <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '1.25rem' }}>
              <SectionHeader icon="📊" title="Daily Energy Balance & Grid Interaction" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.875rem' }}>
                <StatDisplay
                  label="Annual DC Yield"
                  value={`${results.dcYield.toFixed(0)} kWh`}
                  sub={`${(results.dcYield / 365).toFixed(1)} kWh/day (before losses)`}
                  color="#fbbf24"
                />
                <StatDisplay
                  label="Annual AC Output"
                  value={`${results.acOutput.toFixed(0)} kWh`}
                  sub={`${(results.acOutput / 365).toFixed(1)} kWh/day (after ${systemLosses}% loss)`}
                  color="#34d399"
                />
                <StatDisplay
                  label="Annual Demand"
                  value={`${(dailyConsumption * 365).toFixed(0)} kWh`}
                  sub={`${dailyConsumption} kWh/day`}
                  color="#94a3b8"
                />
                <StatDisplay
                  label="Self-Sufficiency"
                  value={`${results.selfSufficiency.toFixed(1)}%`}
                  sub={results.selfSufficiency >= 100 ? 'Surplus generation ✓' : `Covered by solar`}
                  color={results.selfSufficiency >= 80 ? '#34d399' : results.selfSufficiency >= 50 ? '#fbbf24' : '#f87171'}
                  highlight={true}
                />
                {systemType === 'Off-Grid' && (
                  <StatDisplay
                    label="Unmet Load"
                    value={`${results.unmetLoad.toFixed(0)} kWh/yr`}
                    sub={`${(results.unmetLoad / 365).toFixed(2)} kWh/day shortfall`}
                    color={results.unmetLoad > 0 ? '#f87171' : '#34d399'}
                  />
                )}
                <StatDisplay
                  label="Specific Yield"
                  value={`${(results.acOutput / systemSize).toFixed(0)} kWh/kWp`}
                  sub="Annual AC output per installed kWp"
                  color="#818cf8"
                />
              </div>
              {/* Self-sufficiency progress bar */}
              <div style={{ marginTop: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.75rem', color: '#64748b' }}>
                  <span>Self-Sufficiency Progress</span>
                  <span style={{ color: results.selfSufficiency >= 80 ? '#34d399' : '#fbbf24', fontWeight: 600 }}>{results.selfSufficiency.toFixed(1)}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(100, results.selfSufficiency)}%`,
                      background: results.selfSufficiency >= 80
                        ? 'linear-gradient(90deg, #10b981, #34d399)'
                        : results.selfSufficiency >= 50
                        ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                        : 'linear-gradient(90deg, #ef4444, #f87171)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* SVG Chart */}
            <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '1.25rem' }}>
              <SectionHeader
                icon="📈"
                title="25-Year Financial Projection"
                badge={<span className="badge badge-blue">Hover for details</span>}
              />
              <FinancialChart
                cumulativeCost={results.cumulativeCost}
                cumulativeReturns={results.cumulativeReturns}
                breakEvenYear={results.breakEvenYear}
                batteryReplacementYears={results.batteryReplacementYears}
              />
              {results.batteryReplacementYears.length > 0 && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ display: 'inline-block', width: '16px', height: '2px', background: '#fbbf24', borderTop: '2px dashed #fbbf24' }}></span>
                  Battery replacement at years: <strong style={{ color: '#fbbf24' }}>{results.batteryReplacementYears.join(', ')}</strong> (cost jumps in red line)
                </div>
              )}
            </div>

            {/* Transparency Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
              {/* Market Rate Constants */}
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <SectionHeader icon="📋" title="Market Rate Constants (2025)" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                  {[
                    { label: 'DCR Panel', val: `₹${CONSTANTS.panels.DCR}/W`, badge: 'badge-blue' },
                    { label: 'Non-DCR Panel', val: `₹${CONSTANTS.panels.NonDCR}/W`, badge: 'badge-blue' },
                    { label: 'Grid-Tie Inverter', val: `₹${CONSTANTS.inverters.GridTie}/W`, badge: 'badge-green' },
                    { label: 'Hybrid Inverter', val: `₹${CONSTANTS.inverters.Hybrid}/W`, badge: 'badge-green' },
                    { label: 'LiFePO4 Battery', val: `₹${CONSTANTS.batteries.LiFePO4.pricePerKWh.toLocaleString('en-IN')}/kWh`, badge: 'badge-yellow' },
                    { label: 'Lead Acid Battery', val: `₹${CONSTANTS.batteries.LeadAcid.pricePerKWh.toLocaleString('en-IN')}/kWh`, badge: 'badge-yellow' },
                  ].map(({ label, val, badge }) => (
                    <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem', padding: '0.625rem' }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{label}</div>
                      <div className={`badge ${badge}`} style={{ marginTop: '4px' }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '1rem', fontSize: '0.7rem', color: '#475569' }}>
                  Source: MNRE, CEEW, NISE market reports. Prices are indicative.
                </div>
              </div>

              {/* Efficiency Audit */}
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <SectionHeader icon="🔬" title="Efficiency Audit" />
                {[
                  { label: 'System Losses', val: `${systemLosses}%`, pct: systemLosses / 30, color: '#f59e0b', note: 'MPPT + Inverter + Wiring + Soiling' },
                  { label: 'Panel Degradation (25yr)', val: `${(100 - Math.pow(1 - panelDegradation / 100, 25) * 100).toFixed(1)}%`, pct: (1 - Math.pow(1 - panelDegradation / 100, 25)), color: '#f87171', note: `${panelDegradation}%/yr compounded` },
                  { label: 'Effective Efficiency', val: `${(100 - systemLosses).toFixed(0)}%`, pct: (100 - systemLosses) / 100, color: '#34d399', note: 'Year 1 AC output ratio' },
                  ...(hasBattery ? [{ label: `Battery DoD (${batteryType})`, val: `${batterySpec.DoD * 100}%`, pct: batterySpec.DoD, color: '#818cf8', note: 'Usable capacity depth' }] : []),
                  { label: 'PSH at Location', val: `${psh.toFixed(1)} hrs`, pct: psh / 7, color: '#fbbf24', note: `Lat ${location.lat.toFixed(2)}° solar resource` },
                ].map(({ label, val, pct, color, note }) => (
                  <div key={label} style={{ marginBottom: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>{label}</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color }}>{val}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${Math.min(100, pct * 100)}%`, background: color }} />
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '3px' }}>{note}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Subsidy Info Banner */}
            {systemType !== 'Off-Grid' && (
              <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.25rem', borderColor: 'rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ fontSize: '1.5rem' }}>🏛️</div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#34d399', marginBottom: '4px' }}>PM Surya Ghar Muft Bijli Yojana — Subsidy Tiers</div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.6 }}>
                      Up to 1 kW: <strong style={{ color: '#fbbf24' }}>₹30,000</strong> &nbsp;|&nbsp;
                      1–2 kW: <strong style={{ color: '#fbbf24' }}>₹60,000</strong> &nbsp;|&nbsp;
                      2–3 kW: <strong style={{ color: '#fbbf24' }}>₹78,000</strong> &nbsp;|&nbsp;
                      Above 3 kW: <strong style={{ color: '#fbbf24' }}>₹78,000 (capped)</strong>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                      Applicable to residential grid-tied & hybrid systems only. Check your DISCOM / MNRE portal for state-specific top-ups.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="no-print" style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '1.5rem 2rem',
        textAlign: 'center',
        color: '#334155',
        fontSize: '0.75rem',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <p style={{ margin: 0 }}>
            SolarBharat Calculator · Built with ❤️ for India's solar revolution · Data from MNRE, CEEW, NISE (2025)
          </p>
          <p style={{ margin: '4px 0 0' }}>
            Estimates are indicative. Consult a certified solar installer (TERI/NISE empanelled) for final design.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
