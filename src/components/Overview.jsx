import { useState } from 'react';
import './overview.css';

export function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function overviewData(workouts, meals, schedule, now = new Date()) {
  const today = dateKey(now);
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay()+6)%7);
  const week = workouts.filter(w => w.date >= dateKey(monday) && w.date <= today);
  const entries = meals[today] || [];
  return {
    days: new Set(week.map(w => w.date)).size,
    goal: schedule.filter(v => v && v !== 'rest').length,
    protein: entries.reduce((s,m) => s+(Number(m.protein)||0),0),
    calories: entries.reduce((s,m) => s+(Number(m.cals)||0),0),
    sets: week.reduce((sum,w) => sum+(w.exercises||[]).reduce((n,e) => n+(e.sets||[]).filter(s => !s.warmup && Number(s.reps)>0).length,0),0),
  };
}

export default function Overview({ workouts=[], meals={}, schedule=[], splits=[], proteinTarget=180, calorieTarget=2500, onNavigate, username='' }) {
  const [range, setRange] = useState(7);
  const now = new Date();
  const data = overviewData(workouts, meals, schedule, now);
  const rings = [
    { label:'Training days', value:data.days, goal:data.goal, unit:'this week', color:'#c5fa5f', tab:'workout' },
    { label:'Protein', value:Math.round(data.protein), goal:proteinTarget, unit:'g today', color:'#8d9fff', tab:'nutrition' },
    { label:'Fuel', value:Math.round(data.calories), goal:calorieTarget, unit:'kcal today', color:'#ff9b72', tab:'nutrition' },
  ];
  const selected = schedule[(now.getDay()+6)%7];
  const split = splits.find(s => s.id === selected);
  const points = Array.from({length:range}, (_,i) => {
    const d = new Date(now.getFullYear(),now.getMonth(),now.getDate()-range+1+i);
    return { date:dateKey(d), value:workouts.filter(w => w.date === dateKey(d)).reduce((sum,w) => sum+(w.exercises||[]).reduce((n,e) => n+(e.sets||[]).filter(s => !s.warmup && Number(s.reps)>0).length,0),0) };
  });
  const total = points.reduce((s,p) => s+p.value,0);
  const max = Math.max(1,...points.map(p => p.value));
  const line = points.map((p,i) => `${12+i*336/(range-1)},${108-p.value/max*90}`).join(' ');
  return <section className="overview" aria-label="Your training overview">
    <div className="ov-heading"><div><p className="ov-eyebrow">{now.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})}</p><h2>Your momentum<span>.</span></h2></div><span className="ov-avatar" aria-label={username || 'Your profile'}>{(username || 'F').slice(0,1).toUpperCase()}</span></div>
    <p className="ov-intro">A little stronger. Every session.</p>
    <div className="ov-ring-layout">
      <svg viewBox="0 0 240 240" className="ov-rings" role="img" aria-label={rings.map(r => `${r.label}: ${r.value}, ${r.goal>0 ? 'goal '+r.goal : 'no goal set'}`).join('. ')}>
        {rings.map((r,i) => { const radius=101-i*25, c=2*Math.PI*radius, fraction=r.goal>0 ? Math.min(1,Math.max(0,r.value/r.goal)) : 0; return <g key={r.label}><circle cx="120" cy="120" r={radius} fill="none" stroke={r.color} strokeOpacity=".13" strokeWidth="18"/>{fraction>0 && <circle className="ov-ring" cx="120" cy="120" r={radius} fill="none" stroke={r.color} strokeWidth="18" strokeLinecap="round" strokeDasharray={`${c*fraction} ${c}`} transform="rotate(-90 120 120)"/>}</g>; })}
        <text x="120" y="119" textAnchor="middle" fill="#fff" fontSize="29" fontWeight="600">{data.days}</text><text x="120" y="139" textAnchor="middle" fill="#a5a9a4" fontSize="10" letterSpacing="1.5">DAYS ACTIVE</text>
      </svg>
      <div className="ov-ring-stats">{rings.map(r => <button key={r.label} onClick={() => onNavigate(r.tab)} className="ov-stat"><span>{r.label} <span aria-hidden="true">↗</span></span><strong style={{color:r.color}}>{r.value.toLocaleString()}<small> / {r.goal>0 ? r.goal.toLocaleString() : '—'}</small></strong><span>{r.goal>0 ? r.unit : 'Set your schedule'}</span></button>)}</div>
    </div>
    <div className="ov-divider"/>
    <div className="ov-section-head"><h3>Training trend</h3><span>Working sets</span></div>
    <div className="ov-total">{total}<span>sets in {range} days</span></div>
    <svg className="ov-chart" viewBox="0 0 360 130" role="img" aria-label={`${total} working sets logged over the last ${range} days`}><path d="M12 108H348" stroke="#353833" strokeDasharray="2 5"/><polyline points={line} fill="none" stroke="#c5fa5f" strokeWidth="2.5" strokeLinejoin="round"/><circle cx="348" cy={108-points[range-1].value/max*90} r="4" fill="#c5fa5f"/></svg>
    <div className="ov-ranges" aria-label="Chart period">{[7,30,90].map(n => <button key={n} aria-pressed={range===n} onClick={() => setRange(n)}>{n===7 ? '1W' : n===30 ? '1M' : '3M'}</button>)}</div>
    {!total && <p className="ov-empty">Your trend starts with your first logged set.</p>}
    <div className="ov-workout"><div className="ov-section-head"><p className="ov-eyebrow">ON YOUR SCHEDULE</p><span aria-hidden="true">↗</span></div><h3>{selected==='rest' ? 'Room to recover.' : split?.name || 'Make your next move.'}</h3><p>{selected==='rest' ? 'Rest is part of getting stronger. Your plan resumes when you’re ready.' : split ? `${split.exercises.length} exercises · Your pace, your progress.` : 'Choose a workout and build a week that works for you.'}</p><button className="ov-primary" onClick={() => onNavigate('workout')}>{selected==='rest' ? 'View training plan' : 'Go to workout'} <span aria-hidden="true">→</span></button></div>
    <div className="ov-footer"><span>{data.sets} working sets this week</span><button onClick={() => onNavigate('progress')}>All progress ↗</button></div>
  </section>;
}
