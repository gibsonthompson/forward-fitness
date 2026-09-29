import { useState } from 'react';
import Overview, { dateKey } from './components/Overview';
export default function DesignPreview() {
  const [empty,setEmpty]=useState(false);
  const [destination,setDestination]=useState('');
  const workouts=[2,0,3,1,0,2,0,1,0,3,2,0,1,2].map((n,i)=>{ const d=new Date(); d.setDate(d.getDate()-13+i); return {date:dateKey(d),exercises:Array.from({length:n},()=>({sets:Array.from({length:3},()=>({weight:100,reps:8}))}))}; }).filter(w=>w.exercises.length);
  return <div style={{background:'#080a08',minHeight:'100vh',color:'white',fontFamily:'-apple-system,sans-serif',maxWidth:520,margin:'auto',padding:'24px 20px'}}><div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:24,color:'#a5a9a4'}}><span>FORWARD / DESIGN PREVIEW</span><button onClick={()=>setEmpty(!empty)} style={{background:'none',color:'#c5fa5f',border:0,minHeight:44}}>{empty?'Show sample data':'Show empty state'}</button></div><Overview workouts={empty?[]:workouts} meals={empty?{}:{[dateKey(new Date())]:[{protein:124,cals:1820}]}} schedule={empty?[]:['a','rest','a','rest','a','rest','rest']} splits={[{id:'a',name:'Upper body',exercises:['bench','row','ohp','curl']}]} proteinTarget={180} calorieTarget={2500} username="Cody" onNavigate={setDestination}/>{destination && <p role="status" style={{color:'#c5fa5f',fontSize:13}}>Preview: this opens the {destination === 'workout' ? 'Train' : destination} tab in the signed-in app.</p>}<p style={{fontSize:11,color:'#a5a9a4',lineHeight:1.6}}>Sample data · This preview does not connect to your account.</p></div>;
}
