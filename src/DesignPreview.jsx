import { useState } from 'react';
import Overview, { dateKey } from './components/Overview';
import { WorkoutTab, ProgressTab, ConfirmHost } from './App';
import './theme.css';
const splits = [{id:'a',name:'Upper body',exercises:['bench','barbell-row','ohp','barbell-curl']}];
const schedule = ['a','rest','a','rest','a','rest','rest'];
function sampleWorkouts() {
  return [2,0,3,1,0,2,0,1,0,3,2,0,1,2].map((n,i)=>{const d=new Date();d.setDate(d.getDate()-13+i);return {id:`sample-${i}`,date:dateKey(d),exercises:Array.from({length:n},(_,j)=>({exerciseId:splits[0].exercises[j],sets:Array.from({length:3},()=>({weight:100,reps:8}))}))};}).filter(w=>w.exercises.length);
}
export default function DesignPreview() {
  const [empty,setEmpty]=useState(false);
  const [tab,setTab]=useState('home');
  const [message,setMessage]=useState('');
  const [workouts,setWorkouts]=useState(sampleWorkouts);
  function navigate(next) { if(next==='nutrition'){setMessage('Nutrition logging is available after connecting your Supabase account.');return;}setMessage('');setTab(next); }
  const shown=empty?[]:workouts;
  return <div className="forward-app" style={{background:'#000',minHeight:'100dvh',color:'#f0f2ec',fontFamily:'Inter,-apple-system,sans-serif',maxWidth:520,margin:'auto',padding:'24px 20px'}}>
    <ConfirmHost/>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:11,marginBottom:16,color:'#a3ab9e'}}><span>FORWARD / DESIGN PREVIEW</span><button onClick={()=>setEmpty(!empty)} style={{background:'none',color:'#b7df2f',border:0,minHeight:44}}>{empty?'Show sample data':'Show empty state'}</button></div>
    <div className="preview-tabs" aria-label="Preview screens">{[['home','Today'],['workout','Train'],['progress','Progress']].map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>navigate(id)}>{label}</button>)}</div>
    {message && <p role="status" style={{color:'#b7df2f',fontSize:13,lineHeight:1.5,marginBottom:16}}>{message}</p>}
    {tab==='home' && <Overview workouts={shown} meals={empty?{}:{[dateKey(new Date())]:[{protein:124,cals:1820}]}} schedule={empty?[]:schedule} splits={splits} proteinTarget={180} calorieTarget={2500} username="Cody" onNavigate={navigate}/>}
    {tab==='workout' && <WorkoutTab draftKey="ff-design-preview-draft" workouts={shown} splits={splits} weekSchedule={empty?[]:schedule} profile={{username:'Preview'}} restSeconds={0} startRest={()=>{}} flash={setMessage} onSave={async w=>{setWorkouts(old=>old.concat({...w,id:`preview-${Date.now()}`}));localStorage.removeItem('ff-design-preview-draft');setMessage('Workout saved in this preview only.');return true;}} onUpdate={async(id,patch)=>{setWorkouts(old=>old.map(w=>w.id===id?{...w,...patch}:w));return true;}} onDelete={async id=>{setWorkouts(old=>old.filter(w=>w.id!==id));return true;}}/>}
    {tab==='progress' && <ProgressTab workouts={shown} weekSchedule={empty?[]:schedule}/>}
    <p style={{fontSize:11,color:'#a3ab9e',lineHeight:1.6,marginTop:24}}>Sample data · No account connection. Preview workouts stay on this device and do not update your real training log.</p>
  </div>;
}
