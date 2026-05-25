import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const C = {
  navy:"#0f172a",mid:"#1e293b",light:"#334155",
  accent:"#3b82f6",green:"#10b981",amber:"#f59e0b",
  red:"#ef4444",orange:"#f97316",purple:"#8b5cf6",
  teal:"#14b8a6",pink:"#ec4899",sky:"#0ea5e9",
  yellow:"#d97706",indigo:"#6366f1",slate:"#64748b",
  border:"#e2e8f0",bg:"#f8fafc",
};

const PROJECT_COLORS = [
  "#3b82f6","#8b5cf6","#10b981","#f97316","#64748b",
  "#ec4899","#14b8a6","#f59e0b","#6366f1","#0ea5e9","#d97706","#ef4444",
];

const USER_COLORS = PROJECT_COLORS;

const PRI = {
  P0:{label:"P0",color:C.red,    bg:"#fef2f2",border:"#fecaca",desc:"Revenue blocked",staleDays:2},
  P1:{label:"P1",color:C.orange, bg:"#fff7ed",border:"#fed7aa",desc:"Critical",        staleDays:3},
  P2:{label:"P2",color:C.amber,  bg:"#fffbeb",border:"#fde68a",desc:"Important",       staleDays:5},
  P3:{label:"P3",color:C.accent, bg:"#eff6ff",border:"#bfdbfe",desc:"Strategic",       staleDays:7},
  P4:{label:"P4",color:C.slate,  bg:C.bg,     border:C.border, desc:"Backlog",         staleDays:14},
};

const BLOCKER_TYPES = [
  {key:"waiting_strategist",   label:"Waiting on strategist approval", icon:"👤"},
  {key:"waiting_client",       label:"Waiting on client response",      icon:"💬"},
  {key:"waiting_asset",        label:"Waiting on asset / content",      icon:"📄"},
  {key:"waiting_developer",    label:"Waiting on developer",            icon:"💻"},
  {key:"scope_unclear",        label:"Scope unclear",                   icon:"❓"},
  {key:"technical_issue",      label:"Technical issue",                 icon:"⚙️"},
  {key:"need_meeting",         label:"Need meeting / discussion",       icon:"🤝"},
  {key:"dependency_incomplete",label:"Dependency task incomplete",      icon:"🔗"},
  {key:"missing_credentials",  label:"Missing credentials / access",    icon:"🔑"},
  {key:"budget_issue",         label:"Budget / payment issue",          icon:"💰"},
  {key:"vendor_delay",         label:"External vendor delay",           icon:"🚚"},
  {key:"legal_compliance",     label:"Legal / compliance review",       icon:"⚖️"},
  {key:"leadership_decision",  label:"Need decision from leadership",   icon:"🎯"},
  {key:"blocked_by_project",   label:"Blocked by another project",      icon:"🔒"},
  {key:"other",                label:"Other",                           icon:"📌"},
];

const WAITING_KEYS = ["waiting_strategist","waiting_client","waiting_asset","waiting_developer","vendor_delay","dependency_incomplete"];

function mapTask(row) {
  return {
    id:row.id, projectId:row.project_id, priority:row.priority,
    status:row.status, assignee:row.assignee, due:row.due,
    task:row.task, nextAction:row.next_action, notes:row.notes||"",
    escalation:row.escalation||null, blockerType:row.blocker_type||null,
    blockerNote:row.blocker_note||"", blockedSince:row.blocked_since||null,
    lastUpdatedAt:row.last_updated_at||null, lastUpdatedBy:row.last_updated_by||null,
  };
}
function mapUser(row) {
  return {
    id:row.id, authId:row.auth_id, email:row.email,
    name:row.name, shortName:row.short_name, initials:row.initials,
    color:row.color, role:row.role, isSupervisor:!!row.is_supervisor,
  };
}
function userToRow(u) {
  return {
    id:u.id, auth_id:u.authId||null, email:u.email,
    name:u.name, short_name:u.shortName, initials:u.initials,
    color:u.color, role:u.role, is_supervisor:!!u.isSupervisor,
  };
}
function mapProject(row) {
  return {
    id:row.id, name:row.name, color:row.color, client:row.client,
    owner:row.owner, coordinator:row.coordinator, brief:row.brief,
    context:row.context, whoToAsk:row.who_to_ask, driveFolderUrl:row.drive_folder_url||null,
  };
}
function taskToRow(t) {
  return {
    id:t.id, project_id:t.projectId, priority:t.priority, status:t.status,
    assignee:t.assignee, due:t.due, task:t.task, next_action:t.nextAction,
    notes:t.notes, escalation:t.escalation, blocker_type:t.blockerType,
    blocker_note:t.blockerNote, blocked_since:t.blockedSince,
    last_updated_at:t.lastUpdatedAt, last_updated_by:t.lastUpdatedBy,
  };
}
function projectToRow(p) {
  return {
    id:p.id, name:p.name, color:p.color, client:p.client,
    owner:p.owner, coordinator:p.coordinator, brief:p.brief,
    context:p.context, who_to_ask:p.whoToAsk, drive_folder_url:p.driveFolderUrl||null,
  };
}

function computeHealth(projectId, tasks) {
  const pt=tasks.filter(t=>t.projectId===projectId);
  const hasP0Crisis=pt.some(t=>["P0","P1"].includes(t.priority)&&["overdue","stuck"].includes(t.status));
  const stuckCount=pt.filter(t=>t.status==="stuck").length;
  if(hasP0Crisis||stuckCount>=2) return "red";
  if(pt.some(t=>t.status==="overdue")||stuckCount>=1) return "yellow";
  return "green";
}
function isStale(task) {
  if(task.status==="done"||task.due==="TBD") return false;
  if(!task.lastUpdatedAt) return ["P0","P1"].includes(task.priority)&&task.status==="pending";
  return (Date.now()-task.lastUpdatedAt)/864e5>(PRI[task.priority]?.staleDays||7);
}
function todayStr() {
  return new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"});
}
function sortByPriority(tasks) {
  const order={P0:0,P1:1,P2:2,P3:3,P4:4};
  return [...tasks].sort((a,b)=>(order[a.priority]||4)-(order[b.priority]||4));
}
function getBlockerDays(bs) {
  if(!bs) return null;
  return Math.floor((Date.now()-bs)/864e5);
}
function blockerAgeColor(d) {
  if(d===null||d===undefined) return C.slate;
  if(d<=1) return C.slate; if(d<=3) return C.amber;
  if(d<=6) return C.orange; return C.red;
}
function blockerAgeLabel(d) {
  if(d===null||d===undefined) return null;
  if(d===0) return "Blocked today"; if(d===1) return "Blocked 1 day";
  return `Blocked ${d} days`;
}
function genTaskId(projectId, tasks) {
  const n=tasks.filter(t=>t.projectId===projectId).length;
  return `${projectId}-T${n+1}`;
}
function genProjectId(projects) {
  const used=projects.map(p=>p.id);
  for(let c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") if(!used.includes(c)) return c;
  return "P"+Date.now().toString().slice(-4);
}
function getUser(users, userId) {
  return users.find(u=>u.id===userId)||null;
}
function userLabel(users, userId, fallback="Unassigned") {
  return getUser(users,userId)?.shortName||fallback;
}
function findUserByShortName(users, shortName) {
  return users.find(u=>(u.shortName||"").toLowerCase()===shortName.toLowerCase())||null;
}

const inputStyle = {width:"100%",padding:"10px 12px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:14,outline:"none",boxSizing:"border-box",color:C.mid,background:"#fff"};
const taStyle = {...inputStyle,resize:"none",lineHeight:1.6};

function Av({userId,users,size=30}) {
  const u=getUser(users,userId);
  return <span title={u?.name||"Unknown user"} style={{background:u?.color||C.slate,color:"#fff",borderRadius:"50%",width:size,height:size,display:"inline-flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:size*0.36,flexShrink:0,border:"2px solid #fff",boxShadow:"0 1px 3px rgba(0,0,0,0.1)"}}>{u?.initials||"?"}</span>;
}
function PriBadge({priority,showDesc}) {
  const p=PRI[priority]||PRI.P4;
  return <span style={{background:p.bg,color:p.color,border:`1px solid ${p.border}`,borderRadius:6,padding:"2px 7px",fontSize:11,fontWeight:800,display:"inline-flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>{p.label}{showDesc&&<span style={{fontWeight:500,fontSize:10}}>· {p.desc}</span>}</span>;
}
function HealthDot({health,size=10}) {
  const map={red:C.red,yellow:C.amber,green:C.green};
  return <span title={{red:"Blocked",yellow:"At risk",green:"On track"}[health]||""} style={{width:size,height:size,borderRadius:"50%",background:map[health]||C.slate,display:"inline-block",flexShrink:0,boxShadow:`0 0 0 3px ${(map[health]||C.slate)}22`}}/>;
}
function StatusPill({status}) {
  const map={done:[C.green,"Done ✓"],"in-progress":[C.accent,"In Progress"],pending:[C.slate,"Pending"],overdue:[C.red,"Overdue"],stuck:[C.orange,"Stuck ⚠"]};
  const[col,lbl]=map[status]||[C.slate,status];
  return <span style={{background:col+"18",color:col,border:`1px solid ${col}30`,borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{lbl}</span>;
}
function ProjTag({projectId,projects}) {
  const p=projects.find(x=>x.id===projectId);
  if(!p) return null;
  return <span style={{background:p.color+"18",color:p.color,borderRadius:6,padding:"1px 7px",fontSize:11,fontWeight:700}}>{p.id} · {p.name.split(" ").slice(0,2).join(" ")}</span>;
}
function EscBadge({escalation}) {
  if(!escalation) return null;
  const map={"needs_review":["🔺",C.red],"awaiting_update":["📬",C.orange],"agenda":["📅",C.accent]};
  const[icon,col]=map[escalation]||["",C.slate];
  return <span style={{fontSize:14,color:col}}>{icon}</span>;
}
function BlockerAgePill({blockedSince}) {
  const d=getBlockerDays(blockedSince);
  if(d===null) return null;
  const color=blockerAgeColor(d);
  return <span style={{background:color+"15",color,border:`1px solid ${color}30`,borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>⏱ {blockerAgeLabel(d)}</span>;
}
function BlockerTypePill({blockerType}) {
  if(!blockerType) return null;
  const bt=BLOCKER_TYPES.find(b=>b.key===blockerType);
  if(!bt) return null;
  const color=WAITING_KEYS.includes(blockerType)?C.sky:C.orange;
  return <span style={{background:color+"12",color,border:`1px solid ${color}25`,borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:700,display:"inline-flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>{bt.icon} {bt.label}</span>;
}
function KhushbooFlag({users}) {
  const khushboo=findUserByShortName(users,"Khushboo");
  return <span style={{background:C.amber+"18",color:C.yellow,border:`1px solid ${C.amber}30`,borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:700,display:"inline-flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>{khushboo?.initials||"KN"} · Needs Khushboo</span>;
}
function Field({label,children,required}) {
  return (
    <div style={{marginBottom:12}}>
      <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>{label}{required&&<span style={{color:C.red}}> *</span>}</div>
      {children}
    </div>
  );
}

function LoginScreen() {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const handleLogin=async()=>{
    if(!email||!password) return;
    setLoading(true); setError("");
    const{error:e}=await supabase.auth.signInWithPassword({email,password});
    if(e){setError("Invalid email or password.");setLoading(false);}
  };
  return (
    <div className="login-screen" style={{minHeight:"100vh",background:C.navy,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{color:"rgba(255,255,255,0.35)",fontSize:12,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:8}}>Edify Externship</div>
        <div style={{color:"#fff",fontWeight:900,fontSize:26,fontFamily:"Georgia,serif",marginBottom:6}}>Execution OS</div>
        <div style={{color:"rgba(255,255,255,0.4)",fontSize:14}}>Sign in to your workspace</div>
      </div>
      <div style={{width:"100%",maxWidth:380,display:"flex",flexDirection:"column",gap:12}}>
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={{padding:"14px 16px",borderRadius:12,border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.08)",color:"#fff",fontSize:15,outline:"none"}}/>
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={{padding:"14px 16px",borderRadius:12,border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.08)",color:"#fff",fontSize:15,outline:"none"}}/>
        {error&&<div style={{color:C.red,fontSize:13,textAlign:"center"}}>{error}</div>}
        <button onClick={handleLogin} disabled={loading} style={{padding:"14px",borderRadius:12,background:C.accent,color:"#fff",fontWeight:800,fontSize:15,border:"none",cursor:"pointer",marginTop:4}}>{loading?"Signing in...":"Sign In"}</button>
      </div>
    </div>
  );
}

function NotificationBell({tasks,userId}) {
  const [open,setOpen]=useState(false);
  const notifs=useMemo(()=>{
    const today=new Date(); today.setHours(0,0,0,0);
    return tasks.filter(t=>{
      if(t.assignee!==userId||t.status==="done") return false;
      if(t.status==="overdue"||t.status==="stuck") return true;
      if(t.due&&t.due!=="TBD"&&Math.ceil((new Date(t.due)-today)/864e5)<=2) return true;
      if(isStale(t)) return true;
      return false;
    });
  },[tasks,userId]);
  const count=notifs.length;
  return (
    <div style={{position:"relative"}}>
      <button onClick={()=>setOpen(!open)} style={{background:"none",border:"none",cursor:"pointer",padding:4,position:"relative",display:"flex",alignItems:"center"}}>
        <span style={{fontSize:20}}>🔔</span>
        {count>0&&<span style={{position:"absolute",top:-2,right:-2,background:C.red,color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{count>9?"9+":count}</span>}
      </button>
      {open&&<>
        <div style={{position:"fixed",top:60,right:16,left:16,maxWidth:488,margin:"0 auto",background:"#fff",borderRadius:16,border:`1px solid ${C.border}`,boxShadow:"0 8px 32px rgba(0,0,0,0.15)",zIndex:200,maxHeight:"70vh",overflow:"hidden",display:"flex",flexDirection:"column"}}>
          <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontWeight:800,color:C.mid,fontSize:15}}>🔔 Your Alerts</div>
            <button onClick={()=>setOpen(false)} style={{background:"none",border:"none",cursor:"pointer",color:C.slate,fontSize:18}}>✕</button>
          </div>
          <div style={{overflowY:"auto",flex:1}}>
            {count===0?<div style={{padding:24,textAlign:"center",color:C.slate,fontSize:14}}>✅ All caught up!</div>:
              notifs.map(t=>{
                const isO=t.status==="overdue",isS=t.status==="stuck";
                const col=isO?C.red:isS?C.orange:C.amber;
                return <div key={t.id} style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <PriBadge priority={t.priority}/>
                    <span style={{background:col+"15",color:col,borderRadius:20,padding:"1px 8px",fontSize:11,fontWeight:700}}>{isO?"Overdue":isS?"Stuck":"Due soon"}</span>
                  </div>
                  <div style={{fontSize:13.5,fontWeight:600,color:C.mid,lineHeight:1.4}}>{t.task}</div>
                  {t.due&&t.due!=="TBD"&&<div style={{fontSize:11,color:C.slate,marginTop:3}}>Due {t.due}</div>}
                </div>;
              })
            }
          </div>
        </div>
        <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:199}}/>
      </>}
    </div>
  );
}

function ProjectModal({project,projects,users,onSave,onClose}) {
  const isEdit=!!project;
  const defaultUserId=users[0]?.id||"";
  const [form,setForm]=useState({
    name:project?.name||"", color:project?.color||PROJECT_COLORS[0],
    client:project?.client||"", owner:project?.owner||defaultUserId,
    coordinator:project?.coordinator||defaultUserId, brief:project?.brief||"",
    context:project?.context||"", whoToAsk:project?.whoToAsk||"",
    driveFolderUrl:project?.driveFolderUrl||"",
  });
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState("");
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const handleSave=async()=>{
    if(!form.name.trim()||!form.client.trim()||!form.brief.trim()){setErr("Name, client, and brief are required.");return;}
    setSaving(true);
    const id=isEdit?project.id:genProjectId(projects);
    const row=projectToRow({...form,id});
    const{error}=isEdit
      ?await supabase.from("projects").update(row).eq("id",id)
      :await supabase.from("projects").insert(row);
    if(error){setErr(error.message);setSaving(false);return;}
    onSave({...form,id});
    onClose();
  };

  return (
    <div className="modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.65)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div className="modal-sheet" onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:"20px 20px 0 0",padding:"22px 20px 40px",width:"100%",maxWidth:520,maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{width:40,height:4,background:C.border,borderRadius:4,margin:"0 auto 18px"}}/>
        <div style={{fontSize:17,fontWeight:800,color:C.mid,marginBottom:20}}>{isEdit?"Edit Project":"New Project"}</div>
        <Field label="Project Name" required><input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Mansa Admissions 2026" style={inputStyle}/></Field>
        <Field label="Color">
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {PROJECT_COLORS.map(col=><div key={col} onClick={()=>set("color",col)} style={{width:28,height:28,borderRadius:"50%",background:col,cursor:"pointer",border:form.color===col?`3px solid ${C.mid}`:"3px solid transparent",boxSizing:"border-box"}}/>)}
          </div>
        </Field>
        <Field label="Client" required><input value={form.client} onChange={e=>set("client",e.target.value)} placeholder="e.g. Mansa College / Internal" style={inputStyle}/></Field>
        <div style={{display:"flex",gap:10,marginBottom:12}}>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>Owner</div>
            <select value={form.owner} onChange={e=>set("owner",e.target.value)} style={inputStyle}>{users.map(u=><option key={u.id} value={u.id}>{u.shortName}</option>)}</select>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>Coordinator</div>
            <select value={form.coordinator} onChange={e=>set("coordinator",e.target.value)} style={inputStyle}>{users.map(u=><option key={u.id} value={u.id}>{u.shortName}</option>)}</select>
          </div>
        </div>
        <Field label="Brief (one line)" required><input value={form.brief} onChange={e=>set("brief",e.target.value)} placeholder="What is this project in one sentence?" style={inputStyle}/></Field>
        <Field label="Context (situation, what's at stake)"><textarea value={form.context} onChange={e=>set("context",e.target.value)} placeholder="What does the team need to know? What's the risk?" style={{...taStyle,height:90}}/></Field>
        <Field label="Who to Ask"><input value={form.whoToAsk} onChange={e=>set("whoToAsk",e.target.value)} placeholder="e.g. Khushboo (coord) · Strategist (direction)" style={inputStyle}/></Field>
        <Field label="Google Drive Folder URL"><input value={form.driveFolderUrl} onChange={e=>set("driveFolderUrl",e.target.value)} placeholder="https://drive.google.com/drive/folders/..." style={inputStyle}/></Field>
        {err&&<div style={{fontSize:13,color:C.red,marginBottom:12}}>{err}</div>}
        <div style={{display:"flex",gap:10,marginTop:4}}>
          <button onClick={onClose} style={{flex:1,padding:"13px",borderRadius:10,border:`1px solid ${C.border}`,background:"#fff",color:C.slate,fontWeight:700,fontSize:15,cursor:"pointer"}}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{flex:2,padding:"13px",borderRadius:10,border:"none",background:C.accent,color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer"}}>{saving?"Saving...":isEdit?"Save Changes":"Create Project"}</button>
        </div>
      </div>
    </div>
  );
}

function AddTaskModal({projects,tasks,users,currentUser,onSave,onClose,defaultProjectId}) {
  const [form,setForm]=useState({
    projectId:defaultProjectId||projects[0]?.id||"",
    priority:"P2", status:"pending",
    assignee:currentUser.id,
    due:"", task:"", nextAction:"", notes:"",
  });
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState("");
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const handleSave=async()=>{
    if(!form.task.trim()||!form.projectId){setErr("Project and task name required.");return;}
    setSaving(true);
    const id=genTaskId(form.projectId,tasks);
    const newTask={...form,id,lastUpdatedAt:Date.now(),lastUpdatedBy:currentUser.id,
      blockerType:null,blockerNote:"",blockedSince:null,escalation:null};
    const{error}=await supabase.from("tasks").insert(taskToRow(newTask));
    if(error){setErr(error.message);setSaving(false);return;}
    onSave(newTask); onClose();
  };

  const needsKhushboo=["P0","P1"].includes(form.priority);

  return (
    <div className="modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.65)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div className="modal-sheet" onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:"20px 20px 0 0",padding:"22px 20px 40px",width:"100%",maxWidth:520,maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{width:40,height:4,background:C.border,borderRadius:4,margin:"0 auto 18px"}}/>
        <div style={{fontSize:17,fontWeight:800,color:C.mid,marginBottom:20}}>Add New Task</div>
        <Field label="Project" required>
          <select value={form.projectId} onChange={e=>set("projectId",e.target.value)} style={inputStyle}>
            {projects.map(p=><option key={p.id} value={p.id}>{p.id} · {p.name}</option>)}
          </select>
        </Field>
        <Field label="Task" required><input value={form.task} onChange={e=>set("task",e.target.value)} placeholder="What needs to be done?" style={inputStyle}/></Field>
        <Field label="Next Action"><input value={form.nextAction} onChange={e=>set("nextAction",e.target.value)} placeholder="The one specific thing to do right now" style={inputStyle}/></Field>
        <div style={{display:"flex",gap:10,marginBottom:12}}>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>Priority</div>
            <select value={form.priority} onChange={e=>set("priority",e.target.value)} style={inputStyle}>
              {Object.entries(PRI).map(([k,v])=><option key={k} value={k}>{k} — {v.desc}</option>)}
            </select>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>Assign to</div>
            <select value={form.assignee} onChange={e=>set("assignee",e.target.value)} style={inputStyle}>
              {users.map(u=><option key={u.id} value={u.id}>{u.shortName}</option>)}
            </select>
          </div>
        </div>
        {needsKhushboo&&<div style={{background:C.amber+"12",border:`1px solid ${C.amber}30`,borderRadius:10,padding:"10px 13px",marginBottom:12,display:"flex",alignItems:"center",gap:8}}><Av userId={findUserByShortName(users,"Khushboo")?.id} users={users} size={22}/><span style={{fontSize:13,color:C.yellow,fontWeight:600}}>P0/P1 — loop Khushboo in on this task.</span></div>}
        <Field label="Due Date"><input type="date" value={form.due} onChange={e=>set("due",e.target.value)} style={inputStyle}/></Field>
        <Field label="Notes"><textarea value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="Any additional context..." style={{...taStyle,height:60}}/></Field>
        {err&&<div style={{fontSize:13,color:C.red,marginBottom:12}}>{err}</div>}
        <div style={{display:"flex",gap:10,marginTop:4}}>
          <button onClick={onClose} style={{flex:1,padding:"13px",borderRadius:10,border:`1px solid ${C.border}`,background:"#fff",color:C.slate,fontWeight:700,fontSize:15,cursor:"pointer"}}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{flex:2,padding:"13px",borderRadius:10,border:"none",background:C.accent,color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer"}}>{saving?"Adding...":"Add Task"}</button>
        </div>
      </div>
    </div>
  );
}

function PriorityFilter({active,onChange,tasks}) {
  const counts={all:tasks.length};
  Object.keys(PRI).forEach(k=>{counts[k]=tasks.filter(t=>t.priority===k).length;});
  const opts=[{key:"all",label:"All",color:C.slate},...Object.entries(PRI).map(([k,v])=>({key:k,label:v.label,color:v.color}))];
  return (
    <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",paddingBottom:2}}>
      {opts.map(o=><button key={o.key} onClick={()=>onChange(o.key)} style={{padding:"6px 12px",borderRadius:20,border:`1.5px solid ${active===o.key?o.color:C.border}`,background:active===o.key?o.color+"15":"#fff",color:active===o.key?o.color:C.slate,fontWeight:700,fontSize:12,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,display:"flex",alignItems:"center",gap:5}}>
        {o.label}{counts[o.key]>0&&<span style={{background:active===o.key?o.color:C.border,color:active===o.key?"#fff":C.slate,borderRadius:10,padding:"0 5px",fontSize:10,fontWeight:800}}>{counts[o.key]}</span>}
      </button>)}
    </div>
  );
}

function BlockerSelector({blockerType,blockerNote,onTypeChange,onNoteChange}) {
  return (
    <div style={{background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:12,padding:"14px",marginBottom:16}}>
      <div style={{fontSize:12,fontWeight:700,color:C.orange,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>🔒 What's blocking this? <span style={{color:C.red}}>Required</span></div>
      <div style={{maxHeight:230,overflowY:"auto",marginBottom:12,display:"flex",flexDirection:"column",gap:6}}>
        {BLOCKER_TYPES.map(bt=><div key={bt.key} onClick={()=>onTypeChange(bt.key)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:blockerType===bt.key?"#fff7ed":"#fff",border:`1.5px solid ${blockerType===bt.key?C.orange:C.border}`,borderRadius:9,cursor:"pointer"}}>
          <span style={{fontSize:17,flexShrink:0}}>{bt.icon}</span>
          <span style={{fontSize:13.5,color:blockerType===bt.key?C.orange:C.mid,fontWeight:blockerType===bt.key?700:400,lineHeight:1.3}}>{bt.label}</span>
          {blockerType===bt.key&&<span style={{marginLeft:"auto",color:C.orange,fontSize:15}}>✓</span>}
        </div>)}
      </div>
      <textarea value={blockerNote} onChange={e=>onNoteChange(e.target.value)} placeholder="What specifically is needed to unblock?" style={{...taStyle,height:80,border:`1.5px solid ${blockerNote.trim().length>=5?C.green:C.border}`}}/>
    </div>
  );
}

function TaskCard({task,onTap,showProject=true,projects,users}) {
  const p=projects.find(x=>x.id===task.projectId);
  const stale=isStale(task);
  const pri=PRI[task.priority]||PRI.P4;
  const isBlocked=task.status==="stuck";
  const isWaiting=isBlocked&&WAITING_KEYS.includes(task.blockerType);
  const blockerColor=isWaiting?C.sky:C.orange;
  const days=getBlockerDays(task.blockedSince);
  const khushboo=findUserByShortName(users,"Khushboo");
  const needsKhushboo=["P0","P1"].includes(task.priority)||task.assignee===khushboo?.id;

  return (
    <div className="task-card" onClick={()=>onTap(task)} style={{background:isBlocked?(isWaiting?"#f0f9ff":"#fff7ed"):"#fff",border:`1px solid ${isBlocked?blockerColor+"35":C.border}`,borderLeft:`3px solid ${isBlocked?blockerColor:pri.color}`,borderRadius:11,padding:"13px 14px",marginBottom:9,cursor:"pointer"}}>
      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8,flexWrap:"wrap"}}>
        <PriBadge priority={task.priority}/>
        {isBlocked?<span style={{background:blockerColor+"18",color:blockerColor,border:`1px solid ${blockerColor}30`,borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:700}}>{isWaiting?"⏳ Waiting":"🔒 Stuck"}</span>:<StatusPill status={task.status}/>}
        {stale&&!isBlocked&&<span style={{background:C.amber+"15",color:C.amber,border:`1px solid ${C.amber}30`,borderRadius:20,padding:"1px 7px",fontSize:10,fontWeight:700}}>⏱ Stale</span>}
        {task.escalation&&<EscBadge escalation={task.escalation}/>}
        {needsKhushboo&&<KhushbooFlag users={users}/>}
        <div style={{flex:1}}/><Av userId={task.assignee} users={users} size={24}/>
      </div>
      <div style={{fontSize:14,fontWeight:600,color:C.mid,lineHeight:1.4,marginBottom:8}}>{task.task}</div>
      {isBlocked&&task.blockerType&&<div style={{background:"#fff",border:`1px solid ${blockerColor}25`,borderRadius:8,padding:"9px 11px",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:task.blockerNote?5:0,flexWrap:"wrap"}}>
          <BlockerTypePill blockerType={task.blockerType}/>
          <BlockerAgePill blockedSince={task.blockedSince}/>
          {days!==null&&days>=5&&<span style={{fontSize:10,fontWeight:700,color:C.red}}>⚠ Escalate</span>}
        </div>
        {task.blockerNote&&<div style={{fontSize:12.5,color:C.light,lineHeight:1.5,fontStyle:"italic",marginTop:4}}>"{task.blockerNote}"</div>}
      </div>}
      {!isBlocked&&<div style={{background:pri.bg,border:`1px solid ${pri.border}`,borderRadius:8,padding:"8px 11px",marginBottom:8}}>
        <span style={{fontSize:11,fontWeight:700,color:pri.color,marginRight:5}}>⚡ Next:</span>
        <span style={{fontSize:12.5,color:C.light,lineHeight:1.5}}>{task.nextAction}</span>
      </div>}
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        {showProject&&p&&<ProjTag projectId={p.id} projects={projects}/>}
        {task.due&&task.due!=="TBD"&&<span style={{fontSize:11,color:task.status==="overdue"?C.red:C.slate}}>Due {task.due}</span>}
        {task.notes&&<span style={{fontSize:11,color:C.purple}}>📝</span>}
      </div>
    </div>
  );
}

function TaskModal({task,onSave,onClose,currentUser,projects,users}) {
  const [status,setStatus]=useState(task.status);
  const [notes,setNotes]=useState(task.notes||"");
  const [showEsc,setShowEsc]=useState(false);
  const [escalation,setEscalation]=useState(task.escalation||null);
  const [blockerType,setBlockerType]=useState(task.blockerType||null);
  const [blockerNote,setBlockerNote]=useState(task.blockerNote||"");
  const project=projects.find(p=>p.id===task.projectId);
  const isSupervisor=currentUser.isSupervisor||currentUser.role==="supervisor"||currentUser.role==="admin";
  const pri=PRI[task.priority]||PRI.P4;
  const isStuckNow=status==="stuck";
  const blockerValid=!isStuckNow||(blockerType&&blockerNote.trim().length>=5);
  const khushboo=findUserByShortName(users,"Khushboo");
  const needsKhushboo=["P0","P1"].includes(task.priority)||task.assignee===khushboo?.id;

  const handleStatusChange=(s)=>{setStatus(s);if(s!=="stuck"){setBlockerType(null);setBlockerNote("");}};

  const statuses=[
    {key:"pending",label:"Pending",color:C.slate},
    {key:"in-progress",label:"In Progress",color:C.accent},
    {key:"done",label:"✓ Done",color:C.green},
    {key:"stuck",label:"🔒 Blocked / Waiting",color:C.orange},
  ];
  const escOptions=[
    {key:"awaiting_update",icon:"📬",label:"Request update from "+userLabel(users,task.assignee,"assignee"),color:C.orange},
    {key:"needs_review",icon:"🔺",label:"Escalate to Strategist",color:C.red},
    {key:"agenda",icon:"📅",label:"Add to next meeting agenda",color:C.accent},
    {key:null,icon:"✖",label:"Clear escalation flag",color:C.slate},
  ];

  const handleSave=()=>{
    const now=Date.now(),wasStuck=task.status==="stuck",becomingStuck=status==="stuck";
    onSave({...task,status,notes,escalation,
      blockerType:becomingStuck?blockerType:null,
      blockerNote:becomingStuck?blockerNote:"",
      blockedSince:becomingStuck?(wasStuck?task.blockedSince:now):null,
      lastUpdatedAt:now,lastUpdatedBy:currentUser.id,
    });
  };

  return (
    <div className="modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.65)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div className="modal-sheet" onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:"20px 20px 0 0",padding:"22px 20px 36px",width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{width:40,height:4,background:C.border,borderRadius:4,margin:"0 auto 18px"}}/>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10,flexWrap:"wrap"}}>
          {project&&<ProjTag projectId={project.id} projects={projects}/>}
          <PriBadge priority={task.priority} showDesc/>
          {needsKhushboo&&<KhushbooFlag users={users}/>}
        </div>
        <div style={{fontSize:17,fontWeight:800,color:C.mid,lineHeight:1.4,marginBottom:14}}>{task.task}</div>
        {task.escalation&&<div style={{background:C.orange+"10",border:`1px solid ${C.orange}30`,borderRadius:10,padding:"10px 13px",marginBottom:14,fontSize:13,color:"#78350f"}}>
          {task.escalation==="needs_review"&&"🔺 Escalated to Strategist"}
          {task.escalation==="awaiting_update"&&"📬 Update requested"}
          {task.escalation==="agenda"&&"📅 On next meeting agenda"}
        </div>}
        <div style={{background:pri.bg,border:`1px solid ${pri.border}`,borderRadius:12,padding:"13px 14px",marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:pri.color,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>⚡ Next Action</div>
          <div style={{fontSize:14,color:C.light,lineHeight:1.65}}>{task.nextAction}</div>
        </div>
        {project&&<div style={{marginBottom:16}}>
          <div style={{background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:10,padding:"11px 13px",fontSize:13.5,color:"#0c4a6e",lineHeight:1.7,marginBottom:8}}>
            {project.context}
            <div style={{marginTop:8,fontSize:12,color:C.sky,fontWeight:600}}>Who to ask: {project.whoToAsk}</div>
          </div>
          {project.driveFolderUrl&&<a href={project.driveFolderUrl} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",background:"#fff",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,color:C.accent,fontWeight:700,textDecoration:"none"}}>📁 Open Project Files →</a>}
        </div>}
        <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:"0.06em",margin:"14px 0 10px"}}>Update Status</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
          {statuses.map(s=><button key={s.key} onClick={()=>handleStatusChange(s.key)} style={{padding:"12px 8px",borderRadius:10,border:`2px solid ${status===s.key?s.color:C.border}`,background:status===s.key?s.color+"15":"#fff",color:status===s.key?s.color:C.slate,fontWeight:700,fontSize:13.5,cursor:"pointer"}}>{s.label}</button>)}
        </div>
        {isStuckNow&&<BlockerSelector blockerType={blockerType} blockerNote={blockerNote} onTypeChange={setBlockerType} onNoteChange={setBlockerNote}/>}
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Add context or note for the team..." style={{...taStyle,height:70,marginBottom:14}}/>
        {isSupervisor&&<>
          <button onClick={()=>setShowEsc(!showEsc)} style={{width:"100%",padding:"11px",borderRadius:10,border:`1px solid ${C.border}`,background:showEsc?"#fff7ed":"#fff",color:C.orange,fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:showEsc?12:14,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>🛡 Escalation Options {showEsc?"▲":"▼"}</button>
          {showEsc&&<div style={{background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:12,padding:"14px",marginBottom:14}}>
            {escOptions.map(e=><div key={String(e.key)} onClick={()=>{setEscalation(e.key);setShowEsc(false);}} style={{display:"flex",gap:10,alignItems:"center",padding:"10px 12px",background:escalation===e.key?"#fff7ed":"#fff",border:`1px solid ${escalation===e.key?C.orange:C.border}`,borderRadius:9,marginBottom:7,cursor:"pointer"}}>
              <span style={{fontSize:18}}>{e.icon}</span>
              <span style={{fontSize:13.5,color:C.mid,fontWeight:escalation===e.key?700:400}}>{e.label}</span>
              {escalation===e.key&&<span style={{marginLeft:"auto",color:C.orange,fontSize:12,fontWeight:700}}>Selected</span>}
            </div>)}
          </div>}
        </>}
        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:"13px",borderRadius:10,border:`1px solid ${C.border}`,background:"#fff",color:C.slate,fontWeight:700,fontSize:15,cursor:"pointer"}}>Cancel</button>
          <button onClick={handleSave} disabled={!blockerValid} style={{flex:2,padding:"13px",borderRadius:10,border:"none",background:blockerValid?C.accent:C.border,color:blockerValid?"#fff":C.slate,fontWeight:800,fontSize:15,cursor:blockerValid?"pointer":"not-allowed"}}>{isStuckNow&&!blockerValid?"Select blocker + note":"Save Update"}</button>
        </div>
      </div>
    </div>
  );
}

function AdminPanel({currentUser,users,onUserAdded,projects,onProjectAdded,onProjectEdited}) {
  const [tab,setTab]=useState("users");
  const [newName,setNewName]=useState("");
  const [newShortName,setNewShortName]=useState("");
  const [newInitials,setNewInitials]=useState("");
  const [newColor,setNewColor]=useState(USER_COLORS[0]);
  const [newEmail,setNewEmail]=useState("");
  const [newPassword,setNewPassword]=useState("");
  const [newRole,setNewRole]=useState("member");
  const [newIsSupervisor,setNewIsSupervisor]=useState(false);
  const [creating,setCreating]=useState(false);
  const [msg,setMsg]=useState(null);
  const [projectModal,setProjectModal]=useState(null);

  async function createUser(){
    if(!newName.trim()||!newShortName.trim()||!newInitials.trim()||!newEmail.trim()||!newPassword.trim()){setMsg({type:"error",text:"Name, display name, initials, email, and password are required."});return;}
    setCreating(true); setMsg(null);
    const newUser={email:newEmail.trim(),name:newName.trim(),shortName:newShortName.trim(),initials:newInitials.trim().slice(0,2).toUpperCase(),color:newColor,role:newRole,isSupervisor:newIsSupervisor||newRole==="supervisor"};
    const{data,error}=await supabase.from("users").insert(userToRow(newUser)).select("*").single();
    if(error){setMsg({type:"error",text:error.message});setCreating(false);return;}
    onUserAdded(mapUser(data));
    setMsg({type:"success",text:`Record created. Now go to Supabase → Auth → Add User with email: ${newEmail} / password: ${newPassword}, then copy their UUID into the users table auth_id column.`});
    setNewName(""); setNewShortName(""); setNewInitials(""); setNewColor(USER_COLORS[0]); setNewEmail(""); setNewPassword(""); setNewRole("member"); setNewIsSupervisor(false); setCreating(false);
  }

  if(currentUser.role!=="admin") return <div style={{padding:24,textAlign:"center",color:C.slate}}>Admin access required.</div>;

  return (
    <div>
      <div style={{fontSize:13,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:16}}>Admin Panel</div>
      <div style={{display:"flex",gap:6,marginBottom:20,background:"#fff",borderRadius:10,padding:4,border:`1px solid ${C.border}`}}>
        {[{k:"users",l:"👥 Users"},{k:"projects",l:"📁 Projects"}].map(t=><button key={t.k} onClick={()=>setTab(t.k)} style={{flex:1,padding:"8px 4px",borderRadius:8,border:"none",background:tab===t.k?C.accent:"transparent",color:tab===t.k?"#fff":C.slate,fontWeight:700,fontSize:13,cursor:"pointer"}}>{t.l}</button>)}
      </div>

      {tab==="users"&&<div>
        <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:14,padding:16,marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,color:C.mid,marginBottom:12}}>Add Team Member</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Full name" style={inputStyle}/>
            <div style={{display:"flex",gap:8}}>
              <input value={newShortName} onChange={e=>setNewShortName(e.target.value)} placeholder="Short name" style={{...inputStyle,flex:1}}/>
              <input value={newInitials} onChange={e=>setNewInitials(e.target.value.toUpperCase().slice(0,2))} placeholder="Initials" maxLength={2} style={{...inputStyle,flex:1}}/>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {USER_COLORS.map(col=><button key={col} onClick={()=>setNewColor(col)} title={col} style={{width:28,height:28,borderRadius:"50%",background:col,cursor:"pointer",border:newColor===col?`3px solid ${C.mid}`:"3px solid transparent",padding:0}}/>)}
            </div>
            <input value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="Email address" style={inputStyle}/>
            <input value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Password (share with user)" type="text" style={inputStyle}/>
            <div style={{display:"flex",gap:8}}>
              <select value={newRole} onChange={e=>setNewRole(e.target.value)} style={{...inputStyle,flex:1}}>
                <option value="admin">Admin</option>
                <option value="supervisor">Supervisor</option>
                <option value="member">Member</option>
              </select>
            </div>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.mid,fontWeight:600}}>
              <input type="checkbox" checked={newIsSupervisor} onChange={e=>setNewIsSupervisor(e.target.checked)} style={{width:16,height:16}}/>
              Is supervisor
            </label>
            <button onClick={createUser} disabled={creating} style={{padding:"12px",borderRadius:9,background:C.accent,color:"#fff",fontWeight:700,fontSize:14,border:"none",cursor:"pointer"}}>{creating?"Creating...":"Create User"}</button>
            {msg&&<div style={{fontSize:12,color:msg.type==="error"?C.red:C.green,lineHeight:1.6}}>{msg.text}</div>}
          </div>
        </div>
        <div style={{fontSize:12,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Team ({users.length})</div>
        {users.map(u=><div key={u.id} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
          <Av userId={u.id} users={users} size={36}/>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,color:C.mid,fontSize:14}}>{u.name}</div>
            <div style={{fontSize:12,color:C.slate,marginTop:2}}>{u.email} · {u.shortName} · <span style={{color:u.role==="admin"?C.red:u.role==="supervisor"?C.teal:C.slate,fontWeight:700}}>{u.role}</span>{u.isSupervisor&&<span style={{color:C.teal,fontWeight:700}}> · Supervisor</span>}</div>
          </div>
        </div>)}
      </div>}

      {tab==="projects"&&<div>
        <button onClick={()=>setProjectModal("new")} style={{width:"100%",padding:"13px",borderRadius:12,background:C.accent,color:"#fff",fontWeight:700,fontSize:15,border:"none",cursor:"pointer",marginBottom:16}}>+ New Project</button>
        {projects.map(p=><div key={p.id} style={{background:"#fff",border:`1px solid ${C.border}`,borderLeft:`4px solid ${p.color}`,borderRadius:12,padding:"13px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <span style={{background:p.color+"18",color:p.color,borderRadius:6,padding:"1px 6px",fontSize:11,fontWeight:800}}>{p.id}</span>
              <span style={{fontWeight:700,color:C.mid,fontSize:14}}>{p.name}</span>
            </div>
            <div style={{fontSize:12,color:C.slate}}>{p.client} · {p.driveFolderUrl?<span style={{color:C.green}}>📁 Drive linked</span>:<span>No drive</span>}</div>
          </div>
          <button onClick={()=>setProjectModal(p)} style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.accent,fontWeight:700,fontSize:12,cursor:"pointer"}}>Edit</button>
        </div>)}
      </div>}

      {projectModal&&<ProjectModal
        project={projectModal==="new"?null:projectModal}
        projects={projects}
        users={users}
        onSave={(p)=>{projectModal==="new"?onProjectAdded(p):onProjectEdited(p);}}
        onClose={()=>setProjectModal(null)}
      />}
    </div>
  );
}

function BriefingView({tasks,currentUser,onTaskTap,projects,users}) {
  const isSuper=currentUser.isSupervisor||currentUser.role==="supervisor"||currentUser.role==="admin";
  const myTasks=isSuper?tasks:tasks.filter(t=>t.assignee===currentUser.id);
  const overdue=myTasks.filter(t=>t.status==="overdue");
  const stuck=myTasks.filter(t=>t.status==="stuck");
  const urgent=sortByPriority(myTasks.filter(t=>t.status!=="done"&&t.status!=="overdue"&&t.status!=="stuck"&&["P0","P1"].includes(t.priority)));
  const active=sortByPriority(myTasks.filter(t=>t.status==="in-progress"&&!["P0","P1"].includes(t.priority)));
  const Section=({title,items,color})=>items.length===0?null:<div style={{marginBottom:20}}>
    <div style={{fontSize:12,fontWeight:700,color,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>{title} ({items.length})</div>
    {items.map(t=><TaskCard key={t.id} task={t} onTap={onTaskTap} projects={projects} users={users}/>)}
  </div>;
  return (
    <div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,color:C.slate,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>{todayStr()}</div>
        <div style={{fontSize:22,fontWeight:900,color:C.mid,fontFamily:"Georgia,serif",lineHeight:1.2}}>{isSuper?"Team Briefing":`Good day, ${currentUser.shortName}`}</div>
      </div>
      {overdue.length===0&&stuck.length===0&&urgent.length===0&&active.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:C.slate}}><div style={{fontSize:32,marginBottom:12}}>✅</div><div style={{fontSize:16,fontWeight:700}}>All clear!</div></div>}
      <Section title="🔴 Overdue" items={overdue} color={C.red}/>
      <Section title="🔒 Stuck / Blocked" items={stuck} color={C.orange}/>
      <Section title="⚡ Urgent (P0 / P1)" items={urgent} color={C.red}/>
      <Section title="▶ In Progress" items={active} color={C.accent}/>
    </div>
  );
}

function TasksView({tasks,currentUser,onTaskTap,projects,users,onAddTask}) {
  const isSuper=currentUser.isSupervisor||currentUser.role==="supervisor"||currentUser.role==="admin";
  const [statusFilter,setStatusFilter]=useState("active");
  const [priFilter,setPriFilter]=useState("all");
  const baseTasks=isSuper?tasks:tasks.filter(t=>t.assignee===currentUser.id);
  const byStatus=useMemo(()=>{
    if(statusFilter==="active") return baseTasks.filter(t=>t.status!=="done");
    if(statusFilter==="stuck") return baseTasks.filter(t=>t.status==="stuck");
    if(statusFilter==="done") return baseTasks.filter(t=>t.status==="done");
    return baseTasks;
  },[baseTasks,statusFilter]);
  const filtered=useMemo(()=>sortByPriority(priFilter==="all"?byStatus:byStatus.filter(t=>t.priority===priFilter)),[byStatus,priFilter]);
  const stuckCount=baseTasks.filter(t=>t.status==="stuck").length;
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:15,fontWeight:800,color:C.mid}}>Tasks</div>
        <button onClick={onAddTask} style={{padding:"7px 14px",borderRadius:20,background:C.accent,color:"#fff",fontWeight:700,fontSize:13,border:"none",cursor:"pointer"}}>+ Add Task</button>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:14,background:"#fff",borderRadius:10,padding:4,border:`1px solid ${C.border}`}}>
        {[{k:"active",l:"Active"},{k:"stuck",l:`🔒 Stuck${stuckCount>0?" ("+stuckCount+")":""}`},{k:"done",l:"Done"},...(isSuper?[{k:"all",l:"All Team"}]:[])].map(f=><button key={f.k} onClick={()=>setStatusFilter(f.k)} style={{flex:1,padding:"8px 4px",borderRadius:8,border:"none",background:statusFilter===f.k?(f.k==="stuck"?C.orange:C.accent):"transparent",color:statusFilter===f.k?"#fff":C.slate,fontWeight:700,fontSize:12,cursor:"pointer"}}>{f.l}</button>)}
      </div>
      <PriorityFilter active={priFilter} onChange={setPriFilter} tasks={baseTasks.filter(t=>t.status!=="done")}/>
      {filtered.length===0&&<div style={{textAlign:"center",padding:"30px",color:C.slate,fontSize:14}}>✅ Nothing here.</div>}
      {filtered.map(t=><TaskCard key={t.id} task={t} onTap={onTaskTap} projects={projects} users={users}/>)}
    </div>
  );
}

function ProjectsView({tasks,onTaskTap,projects,users,onAddTask}) {
  const [selected,setSelected]=useState(null);
  if(selected){
    const proj=projects.find(p=>p.id===selected.id)||selected;
    const projTasks=sortByPriority(tasks.filter(t=>t.projectId===proj.id&&t.status!=="done"));
    const health=computeHealth(proj.id,tasks);
    const hLabel={red:"Blocked",yellow:"At risk",green:"On track"};
    const hColor={red:C.red,yellow:C.amber,green:C.green};
    return (
      <div>
        <button onClick={()=>setSelected(null)} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:C.accent,fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:16,padding:0}}>← Back</button>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <HealthDot health={health} size={12}/>
          <span style={{background:proj.color+"20",color:proj.color,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:800}}>{proj.id}</span>
          <span style={{fontWeight:800,color:C.mid,fontSize:17,fontFamily:"Georgia,serif"}}>{proj.name}</span>
          <span style={{fontSize:12,color:hColor[health]||C.slate,fontWeight:700,marginLeft:"auto"}}>{hLabel[health]}</span>
        </div>
        <div style={{background:proj.color+"0d",border:`1px solid ${proj.color}30`,borderRadius:12,padding:"13px 15px",marginBottom:12}}>
          <div style={{fontSize:13.5,color:C.light,lineHeight:1.7,marginBottom:8}}>{proj.context}</div>
          <div style={{fontSize:12,color:proj.color,fontWeight:600}}>Who to ask: {proj.whoToAsk}</div>
        </div>
        {proj.driveFolderUrl&&<a href={proj.driveFolderUrl} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,marginBottom:16,padding:"10px 16px",background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,color:C.accent,fontWeight:700,textDecoration:"none"}}>📁 Open Project Files in Drive →</a>}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:12,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:"0.06em"}}>Open Tasks ({projTasks.length})</div>
          <button onClick={()=>onAddTask(proj.id)} style={{padding:"6px 12px",borderRadius:20,background:C.accent,color:"#fff",fontWeight:700,fontSize:12,border:"none",cursor:"pointer"}}>+ Add Task</button>
        </div>
        {projTasks.length===0&&<div style={{textAlign:"center",padding:"20px",color:C.slate,fontSize:13}}>✅ No open tasks.</div>}
        {projTasks.map(t=><TaskCard key={t.id} task={t} onTap={onTaskTap} showProject={false} projects={projects} users={users}/>)}
      </div>
    );
  }
  return (
    <div>
      <div style={{fontSize:13,color:C.slate,marginBottom:16}}>Tap any project to see status, context, and tasks.</div>
      {projects.map(p=>{
        const health=computeHealth(p.id,tasks);
        const openTasks=tasks.filter(t=>t.projectId===p.id&&t.status!=="done").length;
        const overdueCount=tasks.filter(t=>t.projectId===p.id&&t.status==="overdue").length;
        const p0Count=tasks.filter(t=>t.projectId===p.id&&t.priority==="P0"&&t.status!=="done").length;
        return <div key={p.id} onClick={()=>setSelected(p)} style={{background:"#fff",border:`1px solid ${C.border}`,borderLeft:`4px solid ${p.color}`,borderRadius:12,padding:"14px 15px",marginBottom:10,cursor:"pointer"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <HealthDot health={health}/>
              <span style={{background:p.color+"18",color:p.color,borderRadius:6,padding:"1px 6px",fontSize:11,fontWeight:800}}>{p.id}</span>
              <span style={{fontWeight:800,color:C.mid,fontSize:14}}>{p.name}</span>
            </div>
            <div style={{display:"flex",gap:6}}>
              {p0Count>0&&<span style={{background:C.red+"15",color:C.red,borderRadius:20,padding:"2px 7px",fontSize:10,fontWeight:700}}>P0</span>}
              {overdueCount>0&&<span style={{background:C.red+"15",color:C.red,borderRadius:20,padding:"2px 7px",fontSize:10,fontWeight:700}}>{overdueCount} overdue</span>}
            </div>
          </div>
          <div style={{fontSize:13,color:C.slate,lineHeight:1.5,marginBottom:9}}>{p.brief}</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <Av userId={p.owner} users={users} size={22}/>
            <span style={{fontSize:12,color:C.slate}}>{userLabel(users,p.owner)} · {p.client}</span>
            <div style={{flex:1}}/>
            {p.driveFolderUrl&&<span style={{fontSize:11,color:C.green,fontWeight:700}}>📁</span>}
            {openTasks>0&&<span style={{fontSize:12,color:C.accent,fontWeight:700}}>{openTasks} open →</span>}
          </div>
        </div>;
      })}
    </div>
  );
}

const TABS=[
  {key:"briefing",icon:"⚡",label:"Briefing"},
  {key:"tasks",icon:"✅",label:"Tasks"},
  {key:"projects",icon:"📁",label:"Projects"},
  {key:"admin",icon:"⚙️",label:"Admin",adminOnly:true},
];

export default function App() {
  const [loading,setLoading]=useState(true);
  const [session,setSession]=useState(null);
  const [currentUser,setCurrentUser]=useState(null);
  const [users,setUsers]=useState([]);
  const [tasks,setTasks]=useState([]);
  const [projects,setProjects]=useState([]);
  const [activeTab,setActiveTab]=useState("briefing");
  const [taskModal,setTaskModal]=useState(null);
  const [addTaskModal,setAddTaskModal]=useState(null);
  const [toast,setToast]=useState(null);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>setSession(session));
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>setSession(session));
    return()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(!session){setCurrentUser(null);setLoading(false);return;}
    async function loadAll(){
      setLoading(true);
      const[usersRes,tasksRes,projectsRes]=await Promise.all([
        supabase.from("users").select("*").order("short_name"),
        supabase.from("tasks").select("*"),
        supabase.from("projects").select("*").order("id"),
      ]);
      const loadedUsers=(usersRes.data||[]).map(mapUser);
      setUsers(loadedUsers);
      const me=loadedUsers.find(u=>u.authId===session.user.id);
      setCurrentUser(me||null);
      if(tasksRes.data) setTasks(tasksRes.data.map(mapTask));
      if(projectsRes.data) setProjects(projectsRes.data.map(mapProject));
      setLoading(false);
    }
    loadAll();
  },[session]);

  const showToast=(msg,color=C.green)=>{setToast({msg,color});setTimeout(()=>setToast(null),2500);};

  const handleUpdateTask=async(updated)=>{
    const{error}=await supabase.from("tasks").update(taskToRow(updated)).eq("id",updated.id);
    if(error){showToast("Save failed: "+error.message,C.red);return;}
    setTasks(prev=>prev.map(t=>t.id===updated.id?updated:t));
    setTaskModal(null);
    showToast(updated.status==="done"?"✓ Done!":updated.status==="stuck"?"⚠ Flagged as stuck":"✓ Updated",updated.status==="done"?C.green:updated.status==="stuck"?C.orange:C.accent);
  };

  const handleAddTask=(newTask)=>{setTasks(prev=>[...prev,newTask]);showToast("✓ Task added",C.green);};
  const handleUserAdded=(u)=>{setUsers(prev=>[...prev,u].sort((a,b)=>a.shortName.localeCompare(b.shortName)));showToast("User created",C.green);};
  const handleProjectAdded=(p)=>{setProjects(prev=>[...prev,p].sort((a,b)=>a.id.localeCompare(b.id)));showToast("✓ Project created",C.green);};
  const handleProjectEdited=(p)=>{setProjects(prev=>prev.map(x=>x.id===p.id?p:x));showToast("✓ Project updated",C.green);};
  const handleLogout=async()=>await supabase.auth.signOut();

  if(loading) return <div style={{minHeight:"100vh",background:C.navy,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:"rgba(255,255,255,0.4)",fontSize:14}}>Loading workspace...</div></div>;
  if(!session) return <LoginScreen/>;
  if(!currentUser) return <div style={{minHeight:"100vh",background:C.navy,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
    <div style={{color:"#fff",fontSize:16}}>Account not set up yet.</div>
    <div style={{color:"rgba(255,255,255,0.5)",fontSize:13,textAlign:"center",maxWidth:300}}>Ask admin to add your record to the users table with your auth_id.</div>
    <button onClick={handleLogout} style={{padding:"10px 20px",borderRadius:9,background:"rgba(255,255,255,0.1)",color:"#fff",border:"none",cursor:"pointer",fontWeight:700}}>Sign Out</button>
  </div>;

  const isAdmin=currentUser.role==="admin";
  const visibleTabs=TABS.filter(t=>!t.adminOnly||isAdmin);

  const renderTab=()=>{
    if(activeTab==="briefing") return <BriefingView tasks={tasks} currentUser={currentUser} onTaskTap={setTaskModal} projects={projects} users={users}/>;
    if(activeTab==="tasks")    return <TasksView tasks={tasks} currentUser={currentUser} onTaskTap={setTaskModal} projects={projects} users={users} onAddTask={()=>setAddTaskModal(true)}/>;
    if(activeTab==="projects") return <ProjectsView tasks={tasks} onTaskTap={setTaskModal} projects={projects} users={users} onAddTask={(pid)=>setAddTaskModal(pid)}/>;
    if(activeTab==="admin")    return <AdminPanel currentUser={currentUser} users={users} onUserAdded={handleUserAdded} projects={projects} onProjectAdded={handleProjectAdded} onProjectEdited={handleProjectEdited}/>;
  };

  return (
    <div className="app-shell" style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",maxWidth:520,margin:"0 auto",position:"relative"}}>
      <div className="app-header" style={{background:"#fff",borderBottom:`1px solid ${C.border}`,padding:"13px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:20}}>
        <div>
          <div style={{fontWeight:900,color:C.navy,fontSize:16,fontFamily:"Georgia,serif"}}>Edify OS</div>
          <div style={{fontSize:11,color:C.slate}}>{activeTab==="briefing"?"Daily Briefing":activeTab==="tasks"?"Task Tracker":activeTab==="projects"?"Projects":"Admin Panel"}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <NotificationBell tasks={tasks} userId={currentUser.id}/>
          {currentUser.isSupervisor&&<span style={{background:C.teal+"15",color:C.teal,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>Supervisor</span>}
          <div title="Sign out" onClick={handleLogout} style={{cursor:"pointer"}}><Av userId={currentUser.id} users={users} size={34}/></div>
        </div>
      </div>

      <div className="app-content" style={{flex:1,padding:"18px 16px 88px",overflowY:"auto"}}>{renderTab()}</div>

      <div className="app-tabs" style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:520,background:"#fff",borderTop:`1px solid ${C.border}`,display:"flex",zIndex:20}}>
        {visibleTabs.map(t=><button className={activeTab===t.key?"tab-button active":"tab-button"} key={t.key} onClick={()=>setActiveTab(t.key)} style={{flex:1,padding:"11px 4px 10px",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
          <span style={{fontSize:20}}>{t.icon}</span>
          <span style={{fontSize:11,fontWeight:activeTab===t.key?700:500,color:activeTab===t.key?C.accent:C.slate}}>{t.label}</span>
          {activeTab===t.key&&<div style={{width:20,height:2.5,background:C.accent,borderRadius:2}}/>}
        </button>)}
      </div>

      {taskModal&&<TaskModal task={taskModal} onSave={handleUpdateTask} onClose={()=>setTaskModal(null)} currentUser={currentUser} projects={projects} users={users}/>}
      {addTaskModal&&<AddTaskModal projects={projects} tasks={tasks} users={users} currentUser={currentUser} onSave={handleAddTask} onClose={()=>setAddTaskModal(null)} defaultProjectId={typeof addTaskModal==="string"?addTaskModal:null}/>}
      {toast&&<div style={{position:"fixed",top:76,left:"50%",transform:"translateX(-50%)",background:toast.color,color:"#fff",padding:"10px 20px",borderRadius:20,fontWeight:700,fontSize:14,zIndex:200,boxShadow:"0 4px 20px rgba(0,0,0,0.2)",whiteSpace:"nowrap"}}>{toast.msg}</div>}
    </div>
  );
}






