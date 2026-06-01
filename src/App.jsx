import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — copy .env.example to .env and fill in the values.");
}
const supabase = createClient(supabaseUrl, supabaseKey);

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

const DESIGNATIONS = ["founder","strategist","project manager","digital creator","developer","designer"];

function isAdminRole(role) {
  return role === "admin";
}
function isSupervisorRole(role, isSup) {
  return role === "admin" || !!isSup;
}

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
    color:row.color, role:row.role, designation:row.designation||null, isSupervisor:!!row.is_supervisor,
  };
}
function userToRow(u) {
  return {
    id:u.id, auth_id:u.authId||null, email:u.email,
    name:u.name, short_name:u.shortName, initials:u.initials,
    color:u.color, role:u.role, designation:u.designation||null, is_supervisor:!!u.isSupervisor,
  };
}
function mapSubtask(row) {
  return {
    id:row.id, taskId:row.task_id, title:row.title,
    assignee:row.assignee||null, status:row.status||"pending", createdAt:row.created_at||null,
  };
}
function genSubtaskId(taskId, subtasks) {
  const nums=subtasks.filter(s=>s.taskId===taskId).map(s=>parseInt(s.id.split("-S")[1])||0);
  return `${taskId}-S${Math.max(0,...nums)+1}`;
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

function toMs(v) {
  if(!v) return null;
  const n=typeof v==="number"?v:Number(v);
  return isNaN(n)?new Date(v).getTime():n;
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
  const ms=toMs(task.lastUpdatedAt);
  if(!ms) return ["P0","P1"].includes(task.priority)&&task.status==="pending";
  return (Date.now()-ms)/864e5>(PRI[task.priority]?.staleDays||7);
}
function todayStr() {
  return new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"});
}
function sortByPriority(tasks) {
  const order={P0:0,P1:1,P2:2,P3:3,P4:4};
  return [...tasks].sort((a,b)=>(order[a.priority]||4)-(order[b.priority]||4));
}
function getBlockerDays(bs) {
  const ms=toMs(bs);
  if(!ms) return null;
  return Math.floor((Date.now()-ms)/864e5);
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
  const nums=tasks.filter(t=>t.projectId===projectId).map(t=>parseInt(t.id.split("-T")[1])||0);
  return `${projectId}-T${Math.max(0,...nums)+1}`;
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

function LoginScreen({onSwitch}) {
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
        <div style={{textAlign:"center",marginTop:4}}>
          <span style={{color:"rgba(255,255,255,0.4)",fontSize:14}}>No account? </span>
          <span onClick={onSwitch} style={{color:C.accent,fontWeight:700,fontSize:14,cursor:"pointer"}}>Create one</span>
        </div>
      </div>
    </div>
  );
}

function SignUpScreen({onSwitch}) {
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [confirmPassword,setConfirmPassword]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const [done,setDone]=useState(false);

  const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate=()=>{
    if(!name.trim()||name.trim().length<2) return "Name must be at least 2 characters.";
    if(!email.trim()||!emailRegex.test(email.trim())) return "Enter a valid email address.";
    if(password.length<6) return "Password must be at least 6 characters.";
    if(password!==confirmPassword) return "Passwords do not match.";
    return null;
  };

  const handleSignUp=async()=>{
    const validErr=validate();
    if(validErr){setError(validErr);return;}
    setLoading(true);setError("");

    const normalizedEmail=email.trim().toLowerCase();

    // Check if email already exists (uses a security-definer RPC to bypass RLS)
    const{data:exists}=await supabase.rpc("email_exists",{check_email:normalizedEmail});
    if(exists){
      setError("This email is already registered. Please sign in instead.");
      setLoading(false);return;
    }

    const parts=name.trim().split(" ");
    const initials=parts.map(w=>w[0]||"").join("").slice(0,2).toUpperCase();
    const colors=["#3b82f6","#8b5cf6","#10b981","#f97316","#ec4899","#14b8a6","#f59e0b","#0ea5e9"];
    const color=colors[Math.floor(Math.random()*colors.length)];

    // Pass metadata so the DB trigger can use it when creating the users row
    const{error:authErr}=await supabase.auth.signUp({
      email:normalizedEmail,
      password,
      options:{data:{name:name.trim(),short_name:parts[0],initials,color}},
    });
    if(authErr){
      const msg=authErr.message.toLowerCase();
      if(msg.includes("already registered")||msg.includes("already exists")||msg.includes("already in use")){
        setError("This email is already registered. Please sign in instead.");
      } else {
        setError(authErr.message);
      }
      setLoading(false);return;
    }
    setDone(true);setLoading(false);
  };

  const fieldStyle={padding:"14px 16px",borderRadius:12,border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.08)",color:"#fff",fontSize:15,outline:"none",width:"100%",boxSizing:"border-box"};

  if(done) return (
    <div className="login-screen" style={{minHeight:"100vh",background:C.navy,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{textAlign:"center",maxWidth:380}}>
        <div style={{fontSize:40,marginBottom:16}}>✅</div>
        <div style={{color:"#fff",fontWeight:800,fontSize:20,marginBottom:8}}>Account created!</div>
        <div style={{color:"rgba(255,255,255,0.5)",fontSize:14,lineHeight:1.6,marginBottom:24}}>You're registered as a member. Sign in to get started — an admin can update your role from the Admin panel.</div>
        <button onClick={onSwitch} style={{padding:"14px 32px",borderRadius:12,background:C.accent,color:"#fff",fontWeight:800,fontSize:15,border:"none",cursor:"pointer"}}>Go to Sign In</button>
      </div>
    </div>
  );

  return (
    <div className="login-screen" style={{minHeight:"100vh",background:C.navy,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{color:"rgba(255,255,255,0.35)",fontSize:12,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:8}}>Edify Externship</div>
        <div style={{color:"#fff",fontWeight:900,fontSize:26,fontFamily:"Georgia,serif",marginBottom:6}}>Create Account</div>
        <div style={{color:"rgba(255,255,255,0.4)",fontSize:14}}>Join your workspace</div>
      </div>
      <div style={{width:"100%",maxWidth:380,display:"flex",flexDirection:"column",gap:12}}>
        <input type="text" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSignUp()} style={fieldStyle}/>
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSignUp()} style={fieldStyle}/>
        <input type="password" placeholder="Password (min 6 characters)" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSignUp()} style={fieldStyle}/>
        <input type="password" placeholder="Confirm password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSignUp()} style={{...fieldStyle,borderColor:confirmPassword&&confirmPassword!==password?"#ef4444":"rgba(255,255,255,0.15)"}}/>
        {error&&<div style={{background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:10,padding:"10px 14px",color:"#fca5a5",fontSize:13,textAlign:"center"}}>{error}</div>}
        <button onClick={handleSignUp} disabled={loading} style={{padding:"14px",borderRadius:12,background:C.accent,color:"#fff",fontWeight:800,fontSize:15,border:"none",cursor:"pointer",marginTop:4}}>{loading?"Creating account...":"Create Account"}</button>
        <div style={{textAlign:"center",marginTop:4}}>
          <span style={{color:"rgba(255,255,255,0.4)",fontSize:14}}>Already have an account? </span>
          <span onClick={onSwitch} style={{color:C.accent,fontWeight:700,fontSize:14,cursor:"pointer"}}>Sign in</span>
        </div>
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

function TaskCard({task,onTap,showProject=true,projects,users,subtasks=[]}) {
  const p=projects.find(x=>x.id===task.projectId);
  const taskSubs=subtasks.filter(s=>s.taskId===task.id);
  const doneSubs=taskSubs.filter(s=>s.status==="done").length;
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
        {taskSubs.length>0&&<span style={{fontSize:11,fontWeight:700,color:"#7c3aed",background:"#ede9fe",padding:"2px 7px",borderRadius:20,marginLeft:"auto"}}>☑ {doneSubs}/{taskSubs.length}</span>}
      </div>
    </div>
  );
}

function TaskModal({task,onSave,onClose,currentUser,projects,users,subtasks,allSubtasks,onSubtaskAdded,onSubtaskUpdated,onSubtaskDeleted}) {
  const [status,setStatus]=useState(task.status);
  const [notes,setNotes]=useState(task.notes||"");
  const [showEsc,setShowEsc]=useState(false);
  const [escalation,setEscalation]=useState(task.escalation||null);
  const [blockerType,setBlockerType]=useState(task.blockerType||null);
  const [blockerNote,setBlockerNote]=useState(task.blockerNote||"");
  const [newSubtitle,setNewSubtitle]=useState("");
  const [newSubAssignee,setNewSubAssignee]=useState(task.assignee||"");
  const [subSaving,setSubSaving]=useState(false);

  const handleAddSubtask=async()=>{
    if(!newSubtitle.trim()) return;
    setSubSaving(true);
    const id=genSubtaskId(task.id,allSubtasks);
    const row={id,task_id:task.id,title:newSubtitle.trim(),assignee:newSubAssignee||null,status:"pending",created_at:Date.now()};
    const{error}=await supabase.from("subtasks").insert(row);
    if(!error){onSubtaskAdded(mapSubtask(row));setNewSubtitle("");setNewSubAssignee(task.assignee||"");}
    setSubSaving(false);
  };

  const handleToggleSubtask=async(s)=>{
    const updated={...s,status:s.status==="done"?"pending":"done"};
    const{error}=await supabase.from("subtasks").update({status:updated.status}).eq("id",s.id);
    if(!error) onSubtaskUpdated(updated);
  };

  const handleDeleteSubtask=async(id)=>{
    const{error}=await supabase.from("subtasks").delete().eq("id",id);
    if(!error) onSubtaskDeleted(id);
  };
  const project=projects.find(p=>p.id===task.projectId);
  const isSupervisor=isSupervisorRole(currentUser.role,currentUser.isSupervisor);
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
        <div style={{background:"#f5f3ff",border:"1.5px solid #ddd6fe",borderRadius:14,padding:"13px 14px",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:subtasks.length>0?10:0}}>
            <div style={{fontSize:12,fontWeight:800,color:"#6d28d9",textTransform:"uppercase",letterSpacing:"0.06em"}}>☑ Subtasks</div>
            {subtasks.length>0&&<div style={{fontSize:12,fontWeight:700,color:"#6d28d9",background:"#ede9fe",padding:"2px 8px",borderRadius:20}}>{subtasks.filter(s=>s.status==="done").length}/{subtasks.length} done</div>}
          </div>
          {subtasks.map(s=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid #ddd6fe"}}>
              <button onClick={()=>handleToggleSubtask(s)} style={{width:20,height:20,borderRadius:5,border:`2px solid ${s.status==="done"?"#7c3aed":"#a78bfa"}`,background:s.status==="done"?"#7c3aed":"#fff",color:"#fff",fontWeight:900,fontSize:12,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {s.status==="done"&&"✓"}
              </button>
              <span style={{flex:1,fontSize:13,color:s.status==="done"?"#a78bfa":"#3b1f6e",textDecoration:s.status==="done"?"line-through":"none",lineHeight:1.4}}>{s.title}</span>
              <Av userId={s.assignee} users={users} size={22}/>
              <button onClick={()=>handleDeleteSubtask(s.id)} style={{color:"#a78bfa",background:"none",border:"none",cursor:"pointer",fontSize:14,lineHeight:1,padding:"0 2px"}}>✕</button>
            </div>
          ))}
          {subtasks.length===0&&<div style={{fontSize:12,color:"#a78bfa",marginBottom:8}}>No subtasks yet</div>}
          <div style={{display:"flex",gap:6,marginTop:10}}>
            <input value={newSubtitle} onChange={e=>setNewSubtitle(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAddSubtask()} placeholder="Add a subtask..." style={{flex:1,padding:"7px 10px",borderRadius:8,border:"1px solid #ddd6fe",fontSize:13,outline:"none",background:"#fff"}}/>
            <select value={newSubAssignee} onChange={e=>setNewSubAssignee(e.target.value)} style={{padding:"7px 8px",borderRadius:8,border:"1px solid #ddd6fe",fontSize:12,background:"#fff",maxWidth:90}}>
              <option value="">Anyone</option>
              {users.map(u=><option key={u.id} value={u.id}>{u.shortName}</option>)}
            </select>
            <button onClick={handleAddSubtask} disabled={!newSubtitle.trim()||subSaving} style={{padding:"7px 13px",borderRadius:8,background:newSubtitle.trim()?"#7c3aed":"#ddd6fe",color:"#fff",fontWeight:700,fontSize:14,border:"none",cursor:newSubtitle.trim()?"pointer":"not-allowed"}}>+</button>
          </div>
        </div>
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

function AdminPanel({currentUser,users,onUserRoleChanged,onUserDesignationChanged,onUserSupervisorChanged,projects,onProjectAdded,onProjectEdited}) {
  const [tab,setTab]=useState("users");
  const [projectModal,setProjectModal]=useState(null);
  const [updatingId,setUpdatingId]=useState(null);
  const [toast,setToast]=useState(null);

  const showToastMsg=(msg,color)=>{setToast({msg,color});setTimeout(()=>setToast(null),2000);};

  const handleAccessChange=async(userId,newRole)=>{
    setUpdatingId(userId);
    const{error}=await supabase.from("users").update({role:newRole}).eq("id",userId);
    if(error){showToastMsg("Failed: "+error.message,C.red);}
    else{onUserRoleChanged(userId,newRole);showToastMsg("Access updated",C.green);}
    setUpdatingId(null);
  };

  const handleDesignationChange=async(userId,designation)=>{
    setUpdatingId(userId);
    const{error}=await supabase.from("users").update({designation}).eq("id",userId);
    if(error){showToastMsg("Failed: "+error.message,C.red);}
    else{onUserDesignationChanged(userId,designation);showToastMsg("Title updated",C.green);}
    setUpdatingId(null);
  };

  const handleSupervisorToggle=async(userId,current)=>{
    setUpdatingId(userId);
    const{error}=await supabase.from("users").update({is_supervisor:!current}).eq("id",userId);
    if(error){showToastMsg("Failed: "+error.message,C.red);}
    else{onUserSupervisorChanged(userId,!current);showToastMsg(!current?"Supervisor granted":"Supervisor removed",C.green);}
    setUpdatingId(null);
  };

  if(!isAdminRole(currentUser.role)) return <div style={{padding:24,textAlign:"center",color:C.slate}}>Admin access required.</div>;

  return (
    <div>
      <div style={{fontSize:13,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:16}}>Admin Panel</div>
      <div style={{display:"flex",gap:6,marginBottom:20,background:"#fff",borderRadius:10,padding:4,border:`1px solid ${C.border}`}}>
        {[{k:"users",l:"👥 Team"},{k:"projects",l:"📁 Projects"}].map(t=><button key={t.k} onClick={()=>setTab(t.k)} style={{flex:1,padding:"8px 4px",borderRadius:8,border:"none",background:tab===t.k?C.accent:"transparent",color:tab===t.k?"#fff":C.slate,fontWeight:700,fontSize:13,cursor:"pointer"}}>{t.l}</button>)}
      </div>

      {tab==="users"&&<div>
        <div style={{fontSize:12,color:C.slate,marginBottom:14,lineHeight:1.6}}>Set each member's access level, job title, and supervisor permission.</div>
        {users.map(u=>{
          const isMe=u.id===currentUser.id;
          const isAdmin=u.role==="admin";
          return <div key={u.id} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 14px",marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:isMe?0:10}}>
              <Av userId={u.id} users={users} size={36}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,color:C.mid,fontSize:14}}>{u.name}{isMe&&<span style={{fontSize:11,color:C.accent,fontWeight:700,marginLeft:6}}>· You</span>}</div>
                <div style={{fontSize:12,color:C.slate,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.email}</div>
              </div>
              {isMe&&<div style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:isAdmin?C.red+"15":"#f0fdf4",color:isAdmin?C.red:"#16a34a",border:`1px solid ${isAdmin?C.red+"40":"#bbf7d0"}`}}>{isAdmin?"Admin":"Member"}</div>}
            </div>
            {!isMe&&(updatingId===u.id
              ? <div style={{fontSize:12,color:C.slate,padding:"4px 0"}}>Saving…</div>
              : <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  <select
                    value={u.role==="admin"?"admin":"member"}
                    onChange={e=>handleAccessChange(u.id,e.target.value)}
                    style={{padding:"5px 10px",borderRadius:8,border:`1.5px solid ${isAdmin?C.red:"#16a34a"}`,background:isAdmin?C.red+"12":"#f0fdf4",color:isAdmin?C.red:"#16a34a",fontWeight:700,fontSize:12,outline:"none",cursor:"pointer"}}>
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                  </select>
                  <select
                    value={u.designation||""}
                    onChange={e=>handleDesignationChange(u.id,e.target.value||null)}
                    style={{padding:"5px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,background:C.bg,color:C.mid,fontWeight:600,fontSize:12,outline:"none",cursor:"pointer",flex:1}}>
                    <option value="">No title</option>
                    {DESIGNATIONS.map(d=><option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
                  </select>
                  <button
                    onClick={()=>handleSupervisorToggle(u.id,u.isSupervisor)}
                    style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${u.isSupervisor?C.teal:C.border}`,background:u.isSupervisor?C.teal+"18":"transparent",color:u.isSupervisor?C.teal:C.slate,fontWeight:700,fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>
                    {u.isSupervisor?"★ Supervisor":"☆ Supervisor"}
                  </button>
                </div>
            )}
          </div>;
        })}
        {toast&&<div style={{marginTop:12,padding:"10px 14px",borderRadius:10,background:toast.color+"15",color:toast.color,fontSize:13,fontWeight:700,textAlign:"center"}}>{toast.msg}</div>}
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

function BriefingView({tasks,currentUser,onTaskTap,projects,users,subtasks}) {
  const isSuper=isSupervisorRole(currentUser.role,currentUser.isSupervisor);
  const myTasks=isSuper?tasks:tasks.filter(t=>t.assignee===currentUser.id);
  const overdue=myTasks.filter(t=>t.status==="overdue");
  const stuck=myTasks.filter(t=>t.status==="stuck");
  const urgent=sortByPriority(myTasks.filter(t=>t.status!=="done"&&t.status!=="overdue"&&t.status!=="stuck"&&["P0","P1"].includes(t.priority)));
  const active=sortByPriority(myTasks.filter(t=>t.status==="in-progress"&&!["P0","P1"].includes(t.priority)));
  const Section=({title,items,color})=>items.length===0?null:<div style={{marginBottom:20}}>
    <div style={{fontSize:12,fontWeight:700,color,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>{title} ({items.length})</div>
    {items.map(t=><TaskCard key={t.id} task={t} onTap={onTaskTap} projects={projects} users={users} subtasks={subtasks}/>)}
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

function TasksView({tasks,currentUser,onTaskTap,projects,users,onAddTask,subtasks}) {
  const isSuper=isSupervisorRole(currentUser.role,currentUser.isSupervisor);
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
      {filtered.map(t=><TaskCard key={t.id} task={t} onTap={onTaskTap} projects={projects} users={users} subtasks={subtasks}/>)}
    </div>
  );
}

function ProjectsView({tasks,onTaskTap,projects,users,onAddTask,subtasks}) {
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
        {projTasks.map(t=><TaskCard key={t.id} task={t} onTap={onTaskTap} showProject={false} projects={projects} users={users} subtasks={subtasks}/>)}
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
  const [showSignUp,setShowSignUp]=useState(false);
  const [currentUser,setCurrentUser]=useState(null);
  const [users,setUsers]=useState([]);
  const [tasks,setTasks]=useState([]);
  const [projects,setProjects]=useState([]);
  const [subtasks,setSubtasks]=useState([]);
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
      const[usersRes,tasksRes,projectsRes,subtasksRes]=await Promise.all([
        supabase.from("users").select("*").order("short_name"),
        supabase.from("tasks").select("*"),
        supabase.from("projects").select("*").order("id"),
        supabase.from("subtasks").select("*"),
      ]);
      const loadErr=usersRes.error||tasksRes.error||projectsRes.error||subtasksRes.error;
      if(loadErr){
        const is401=loadErr.status===401||loadErr.code==="PGRST301"||String(loadErr.message).includes("JWT");
        if(is401){await supabase.auth.signOut();return;}
        setToast({msg:"Failed to load data: "+loadErr.message,color:C.red});
        setTimeout(()=>setToast(null),4000);
        setLoading(false);
        return;
      }
      let loadedUsers=(usersRes.data||[]).map(mapUser);
      let me=loadedUsers.find(u=>u.authId===session.user.id);
      if(!me){
        const au=session.user;
        const email=(au.email||"").toLowerCase();
        const existingByEmail=loadedUsers.find(u=>u.email===email);
        if(existingByEmail){
          await supabase.from("users").update({auth_id:au.id}).eq("id",existingByEmail.id);
          me={...existingByEmail,authId:au.id};
          loadedUsers=loadedUsers.map(u=>u.id===me.id?me:u);
        } else {
          const meta=au.user_metadata||{};
          const namePart=email.split("@")[0];
          const colors=["#3b82f6","#8b5cf6","#10b981","#f97316","#ec4899","#14b8a6","#f59e0b","#0ea5e9"];
          const color=colors[Math.abs(namePart.split("").reduce((a,c)=>a+c.charCodeAt(0),0))%8];
          const newRow={
            auth_id:au.id,email,
            name:meta.name||namePart,short_name:meta.short_name||namePart,
            initials:meta.initials||namePart.slice(0,2).toUpperCase(),
            color:meta.color||color,role:"member",is_supervisor:false,
          };
          const{data:inserted,error:insertErr}=await supabase.from("users").insert(newRow).select().single();
          if(!insertErr&&inserted){
            me=mapUser(inserted);
            loadedUsers=[...loadedUsers,me].sort((a,b)=>(a.shortName||"").localeCompare(b.shortName||""));
          }
        }
      }
      setUsers(loadedUsers);
      setCurrentUser(me||null);
      if(tasksRes.data) setTasks(tasksRes.data.map(mapTask));
      if(projectsRes.data) setProjects(projectsRes.data.map(mapProject));
      if(subtasksRes.data) setSubtasks(subtasksRes.data.map(mapSubtask));
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
  const handleSubtaskAdded=(s)=>{setSubtasks(prev=>[...prev,s]);};
  const handleSubtaskUpdated=(s)=>{setSubtasks(prev=>prev.map(x=>x.id===s.id?s:x));};
  const handleSubtaskDeleted=(id)=>{setSubtasks(prev=>prev.filter(x=>x.id!==id));};
  const handleUserRoleChanged=(userId,newRole)=>{setUsers(prev=>prev.map(u=>u.id===userId?{...u,role:newRole}:u));};
  const handleUserDesignationChanged=(userId,designation)=>{setUsers(prev=>prev.map(u=>u.id===userId?{...u,designation}:u));};
  const handleUserSupervisorChanged=(userId,isSup)=>{setUsers(prev=>prev.map(u=>u.id===userId?{...u,isSupervisor:isSup}:u));};
  const handleProjectAdded=(p)=>{setProjects(prev=>[...prev,p].sort((a,b)=>a.id.localeCompare(b.id)));showToast("✓ Project created",C.green);};
  const handleProjectEdited=(p)=>{setProjects(prev=>prev.map(x=>x.id===p.id?p:x));showToast("✓ Project updated",C.green);};
  const handleLogout=async()=>await supabase.auth.signOut();

  if(loading) return <div style={{minHeight:"100vh",background:C.navy,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:"rgba(255,255,255,0.4)",fontSize:14}}>Loading workspace...</div></div>;
  if(!session) return showSignUp
    ? <SignUpScreen onSwitch={()=>setShowSignUp(false)}/>
    : <LoginScreen onSwitch={()=>setShowSignUp(true)}/>;
  if(!currentUser) return <div style={{minHeight:"100vh",background:C.navy,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
    <div style={{color:"#fff",fontSize:16}}>Account not set up yet.</div>
    <div style={{color:"rgba(255,255,255,0.5)",fontSize:13,textAlign:"center",maxWidth:300}}>Ask admin to add your record to the users table with your auth_id.</div>
    <button onClick={handleLogout} style={{padding:"10px 20px",borderRadius:9,background:"rgba(255,255,255,0.1)",color:"#fff",border:"none",cursor:"pointer",fontWeight:700}}>Sign Out</button>
  </div>;

  const isAdmin=isAdminRole(currentUser.role);
  const visibleTabs=TABS.filter(t=>!t.adminOnly||isAdmin);

  const renderTab=()=>{
    if(activeTab==="briefing") return <BriefingView tasks={tasks} currentUser={currentUser} onTaskTap={setTaskModal} projects={projects} users={users} subtasks={subtasks}/>;
    if(activeTab==="tasks")    return <TasksView tasks={tasks} currentUser={currentUser} onTaskTap={setTaskModal} projects={projects} users={users} onAddTask={()=>setAddTaskModal(true)} subtasks={subtasks}/>;
    if(activeTab==="projects") return <ProjectsView tasks={tasks} onTaskTap={setTaskModal} projects={projects} users={users} onAddTask={(pid)=>setAddTaskModal(pid)} subtasks={subtasks}/>;
    if(activeTab==="admin")    return <AdminPanel currentUser={currentUser} users={users} onUserRoleChanged={handleUserRoleChanged} onUserDesignationChanged={handleUserDesignationChanged} onUserSupervisorChanged={handleUserSupervisorChanged} projects={projects} onProjectAdded={handleProjectAdded} onProjectEdited={handleProjectEdited}/>;
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

      {taskModal&&<TaskModal task={taskModal} onSave={handleUpdateTask} onClose={()=>setTaskModal(null)} currentUser={currentUser} projects={projects} users={users} subtasks={subtasks.filter(s=>s.taskId===taskModal.id)} allSubtasks={subtasks} onSubtaskAdded={handleSubtaskAdded} onSubtaskUpdated={handleSubtaskUpdated} onSubtaskDeleted={handleSubtaskDeleted}/>}
      {addTaskModal&&<AddTaskModal projects={projects} tasks={tasks} users={users} currentUser={currentUser} onSave={handleAddTask} onClose={()=>setAddTaskModal(null)} defaultProjectId={typeof addTaskModal==="string"?addTaskModal:null}/>}
      {toast&&<div style={{position:"fixed",top:76,left:"50%",transform:"translateX(-50%)",background:toast.color,color:"#fff",padding:"10px 20px",borderRadius:20,fontWeight:700,fontSize:14,zIndex:200,boxShadow:"0 4px 20px rgba(0,0,0,0.2)",whiteSpace:"nowrap"}}>{toast.msg}</div>}
    </div>
  );
}






