// ─── Firebase + EmailJS 연동 버전 ──────────────────────────────────────────────
// Firebase config (csquared-vacation 프로젝트)
import { useState, useEffect, useCallback } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, doc, setDoc, getDoc, getDocs,
  collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy
} from "firebase/firestore";
import emailjs from "@emailjs/browser";

const firebaseConfig = {
  apiKey: "AIzaSyBFDDpDgUrCWxUPeUw28j0F1T9mLmjtDVk",
  authDomain: "csquared-vacation.firebaseapp.com",
  projectId: "csquared-vacation",
  storageBucket: "csquared-vacation.firebasestorage.app",
  messagingSenderId: "16834141553",
  appId: "1:16834141553:web:17e779ed6e725b6990aad0"
};

const EMAILJS_SERVICE_ID  = "csquared";
const EMAILJS_TEMPLATE_ID = "template_z1ow2nn";
const EMAILJS_PUBLIC_KEY  = "bw7R_6YXR3x9F9y4qu-Np";

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
emailjs.init(EMAILJS_PUBLIC_KEY);

// ─── 상수 ─────────────────────────────────────────────────────────────────────
const DEPARTMENTS = ["자산운용파트","해외운용파트","마케팅팀","리스크관리팀","운용지원팀","경영지원팀"];
const HR_EMAILS   = ["ksm@csquaredasset.com","jsw@csquaredasset.com"];
const HR_APPROVER = "ksm@csquaredasset.com";  // 결재 3단계 고정
const HR_VIEWER   = "jsw@csquaredasset.com";  // 연차 조회/수정 전용
const CEO_EMAIL   = "cjhfund@gmail.com";

const DEFAULT_MANAGER_CONFIG = {
  "자산운용파트": "jk.choi@csquaredasset.com",
  "해외운용파트": "taehun.kim@csquaredasset.com",
  "마케팅팀":    "kimung@csquaredasset.com",
  "리스크관리팀": "jiyang@csquaredasset.com",
  "운용지원팀":  "cea@csquaredasset.com",
  "경영지원팀":  "ksm@csquaredasset.com",
};

const PRESET_USERS = {
  "ksm@csquaredasset.com":        { name:"강수민", dept:"경영지원팀" },
  "jsw@csquaredasset.com":        { name:"인사담당자2", dept:"경영지원팀" },
  "cjhfund@gmail.com":            { name:"대표이사",    dept:"경영진"     },
  "jk.choi@csquaredasset.com":    { name:"자산운용파트장", dept:"자산운용파트" },
  "taehun.kim@csquaredasset.com": { name:"해외운용파트장", dept:"해외운용파트" },
  "kimung@csquaredasset.com":     { name:"마케팅팀장",   dept:"마케팅팀"   },
  "jiyang@csquaredasset.com":     { name:"리스크관리팀장",dept:"리스크관리팀"},
  "cea@csquaredasset.com":        { name:"운용지원팀장", dept:"운용지원팀" },
};

// ─── 유틸 ─────────────────────────────────────────────────────────────────────
function generateTempPw() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({length:5}, () => chars[Math.floor(Math.random()*chars.length)]).join("");
}

function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,"0")}.${String(dt.getDate()).padStart(2,"0")}`;
}

function getDaysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }
function getFirstDay(y,m){ return new Date(y,m,1).getDay(); }

// ─── PDF 기안문서 ──────────────────────────────────────────────────────────────
function generatePDF(r, getUserNameFn) {
  const typeLabel   = r.type==="half" ? "반차" : "연차";
  const approvedDate = r.approvedAt ? formatDate(r.approvedAt) : "-";
  const docNo = `VAC-${new Date(r.createdAt).getFullYear()}-${String(r.id||"").slice(-5)}`;
  const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<title>휴가신청서_${r.applicantName}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Noto Sans KR',sans-serif;font-size:13px;color:#1a1a1a;background:#fff;padding:40px}
.doc{max-width:680px;margin:0 auto}
.company{text-align:center;font-size:12px;color:#555;margin-bottom:4px;letter-spacing:2px}
.title{text-align:center;font-size:22px;font-weight:700;letter-spacing:6px;margin-bottom:28px;padding-bottom:14px;border-bottom:2px solid #1a1a1a}
.meta{display:flex;justify-content:space-between;font-size:11px;color:#777;margin-bottom:24px}
table{width:100%;border-collapse:collapse;margin-bottom:20px}
th,td{border:1px solid #ccc;padding:9px 14px;font-size:13px;vertical-align:middle}
th{background:#f5f5f5;font-weight:500;width:130px;text-align:left;color:#333}
.at th{text-align:center;width:auto}
.at td{text-align:center;height:72px;vertical-align:top;padding-top:10px}
.sl{font-size:11px;color:#777;margin-bottom:4px}
.stamp{display:inline-block;margin-top:8px;border:1.5px solid #c00;color:#c00;font-size:11px;padding:2px 8px;border-radius:2px;letter-spacing:1px}
.notice{margin-top:28px;background:#f9f9f9;border:1px solid #e0e0e0;border-radius:4px;padding:14px 16px}
.notice p{font-size:11px;color:#666;line-height:1.9}
.footer{margin-top:32px;text-align:center;font-size:11px;color:#aaa;padding-top:12px;border-top:1px solid #eee}
@media print{body{padding:20px}@page{margin:1.5cm}}
</style></head><body><div class="doc">
<div class="company">씨스퀘어자산운용 주식회사</div>
<div class="title">휴 가 신 청 서</div>
<div class="meta"><span>문서번호: ${docNo}</span><span>신청일: ${formatDate(r.createdAt)}</span><span>최종승인일: ${approvedDate}</span></div>
<table class="at"><thead><tr><th>신청자</th><th>1차 결재 (팀장)</th><th>2차 결재 (인사)</th><th>최종 결재 (대표이사)</th></tr></thead>
<tbody><tr>
<td><div class="sl">신청</div><div style="font-weight:500">${r.applicantName}</div><div class="stamp">신 청</div></td>
<td><div class="sl">팀장</div><div style="font-weight:500">${getUserNameFn(r.approver2)}</div><div class="stamp">결 재</div></td>
<td><div class="sl">인사담당</div><div style="font-weight:500">${getUserNameFn(r.approver3)}</div><div class="stamp">결 재</div></td>
<td><div class="sl">대표이사</div><div style="font-weight:500">${getUserNameFn(r.approver4)}</div><div class="stamp" style="border-color:#00509e;color:#00509e">승 인</div></td>
</tr></tbody></table>
<table>
<tr><th>소속 부서</th><td>${r.dept}</td><th>신청자 성명</th><td>${r.applicantName}</td></tr>
<tr><th>휴가 종류</th><td><strong style="color:#0a6e4b">${typeLabel}</strong></td><th>사용 일수</th><td><strong style="color:#0a6e4b">${r.dayCount}일</strong></td></tr>
<tr><th>휴가 기간</th><td colspan="3">${(r.dates||[]).sort().join(" · ")}</td></tr>
<tr><th>처리 상태</th><td colspan="3" style="color:#0a6e4b;font-weight:500">✅ 최종 승인 완료 (승인일: ${approvedDate})</td></tr>
</table>
<div class="notice"><p>위와 같이 휴가를 신청하오니 재가하여 주시기 바랍니다.</p>
<p style="margin-top:4px;color:#999">본 문서는 씨스퀘어자산운용(주) 휴가관리 시스템에서 자동 생성된 전자 기안문서입니다.</p></div>
<div class="footer">씨스퀘어자산운용(주) · csquaredasset.com · ${new Date().getFullYear()}</div>
</div><script>window.onload=function(){window.print();}<\/script></body></html>`;
  const blob = new Blob([html],{type:"text/html;charset=utf-8"});
  window.open(URL.createObjectURL(blob),"_blank");
}

// ─── 달력 ─────────────────────────────────────────────────────────────────────
function Calendar({ selectedDates, onToggleDate }) {
  const today = new Date();
  const [vy, setVy] = useState(today.getFullYear());
  const [vm, setVm] = useState(today.getMonth());
  const days = getDaysInMonth(vy,vm);
  const first = getFirstDay(vy,vm);
  const cells = [...Array(first).fill(null), ...Array.from({length:days},(_,i)=>i+1)];
  const isSelected = d => selectedDates.includes(`${vy}-${String(vm+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`);
  const toggle = d => { if(!d) return; onToggleDate(`${vy}-${String(vm+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`); };
  const prev = () => { if(vm===0){setVy(y=>y-1);setVm(11);}else setVm(m=>m-1); };
  const next = () => { if(vm===11){setVy(y=>y+1);setVm(0);}else setVm(m=>m+1); };
  return (
    <div style={{border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"12px",maxWidth:320}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <button onClick={prev} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"var(--color-text-primary)"}}>‹</button>
        <span style={{fontWeight:500,fontSize:14}}>{vy}년 {vm+1}월</span>
        <button onClick={next} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"var(--color-text-primary)"}}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,textAlign:"center"}}>
        {["일","월","화","수","목","금","토"].map((w,i)=>(
          <div key={w} style={{fontSize:11,fontWeight:500,color:i===0?"#e24b4a":i===6?"#378add":"var(--color-text-secondary)",padding:"4px 0"}}>{w}</div>
        ))}
        {cells.map((d,i)=>(
          <div key={i} onClick={()=>toggle(d)} style={{
            padding:"6px 2px",fontSize:13,borderRadius:6,cursor:d?"pointer":"default",
            background:d&&isSelected(d)?"#1d9e75":"transparent",
            color:d&&isSelected(d)?"#fff":d?"var(--color-text-primary)":"transparent",
            fontWeight:d&&isSelected(d)?500:400,
          }}>{d||""}</div>
        ))}
      </div>
      {selectedDates.length>0&&(
        <div style={{marginTop:8,fontSize:12,color:"var(--color-text-secondary)",borderTop:"0.5px solid var(--color-border-tertiary)",paddingTop:8}}>
          선택: {[...selectedDates].sort().join(", ")}
        </div>
      )}
    </div>
  );
}

// ─── 메인 앱 ──────────────────────────────────────────────────────────────────
export default function App() {
  const [loading,   setLoading]   = useState(true);
  const [users,     setUsers]     = useState({});
  const [requests,  setRequests]  = useState([]);
  const [managerConfig, setManagerConfig] = useState(DEFAULT_MANAGER_CONFIG);
  const [currentUser, setCurrentUser] = useState(null);
  const [page,      setPage]      = useState("login");
  const [tab,       setTab]       = useState("apply");
  const [authMode,  setAuthMode]  = useState("login");
  const [msg,       setMsg]       = useState("");
  const [notif,     setNotif]     = useState("");
  const [loginForm, setLoginForm] = useState({email:"",password:""});
  const [regForm,   setRegForm]   = useState({email:"",name:"",dept:"자산운용파트",password:"",confirm:""});
  const [findForm,  setFindForm]  = useState({email:"",name:""});
  const [applyForm, setApplyForm] = useState({dates:[],type:"annual",approver2:""});
  const [myInfoForm,setMyInfoForm]= useState({position:"",oldPw:"",newPw:"",confirmPw:""});
  const [editLeave, setEditLeave] = useState({});

  const showNotif = (text,ms=2800) => { setNotif(text); setTimeout(()=>setNotif(""),ms); };

  // ── Firestore 초기 로드 ───────────────────────────────────────────────────
  useEffect(()=>{
    const init = async () => {
      // 프리셋 유저 Firestore에 없으면 생성
      for(const [email, info] of Object.entries(PRESET_USERS)){
        const ref = doc(db,"users",email.replace(/\./g,"_").replace(/@/g,"__"));
        const snap = await getDoc(ref);
        if(!snap.exists()){
          await setDoc(ref,{
            email, name:info.name, dept:info.dept,
            password:"admin1", annualLeave:15, usedLeave:0, position:""
          });
        }
      }
      // 매니저 설정 로드
      const mcSnap = await getDoc(doc(db,"config","managerConfig"));
      if(mcSnap.exists()) setManagerConfig(mcSnap.data());
      else await setDoc(doc(db,"config","managerConfig"), DEFAULT_MANAGER_CONFIG);

      setLoading(false);
    };
    init();
  },[]);

  // ── 유저 목록 실시간 구독 ────────────────────────────────────────────────
  useEffect(()=>{
    const unsub = onSnapshot(collection(db,"users"), snap=>{
      const data={};
      snap.forEach(d=>{ data[d.data().email]=d.data(); });
      setUsers(data);
    });
    return unsub;
  },[]);

  // ── 결재 목록 실시간 구독 ────────────────────────────────────────────────
  useEffect(()=>{
    const q = query(collection(db,"requests"), orderBy("createdAt","desc"));
    const unsub = onSnapshot(q, snap=>{
      setRequests(snap.docs.map(d=>({...d.data(), id:d.id})));
    });
    return unsub;
  },[]);

  // ── 헬퍼 ─────────────────────────────────────────────────────────────────
  const emailToKey = e => e.replace(/\./g,"_").replace(/@/g,"__");

  const getUserRole = useCallback((email)=>{
    if(!email) return "user";
    if(email===CEO_EMAIL) return "ceo";
    if(email===HR_APPROVER) return "hr";
    if(email===HR_VIEWER) return "hr_viewer";
    if(Object.values(managerConfig).includes(email)) return "manager";
    return "user";
  },[managerConfig]);

  const getUserName = email => users[email]?.name || email;

  // ── 로그인 ───────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    const u = users[loginForm.email];
    if(!u){ setMsg("가입되지 않은 이메일입니다."); return; }
    if(u.password!==loginForm.password){ setMsg("비밀번호가 틀렸습니다."); return; }
    setCurrentUser({...u, role:getUserRole(loginForm.email)});
    setPage("main"); setTab("apply"); setMsg("");
  };

  // ── 회원가입 ─────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    if(!regForm.email||!regForm.name||!regForm.password){ setMsg("모든 항목을 입력해주세요."); return; }
    if(regForm.password!==regForm.confirm){ setMsg("비밀번호가 일치하지 않습니다."); return; }
    const existing = users[regForm.email];
    if(existing && existing.password!=="admin1"){ setMsg("이미 가입된 이메일입니다."); return; }
    const key = emailToKey(regForm.email);
    const role = getUserRole(regForm.email);
    await setDoc(doc(db,"users",key),{
      email:regForm.email, name:regForm.name, dept:regForm.dept,
      password:regForm.password, role,
      annualLeave:existing?.annualLeave??15,
      usedLeave:existing?.usedLeave??0,
      position:existing?.position??""
    });
    setMsg("회원가입이 완료되었습니다. 로그인해 주세요.");
    setAuthMode("login");
    setRegForm({email:"",name:"",dept:"자산운용파트",password:"",confirm:""});
  };

  // ── 비밀번호 찾기 ─────────────────────────────────────────────────────────
  const handleFindPw = async () => {
    const u = users[findForm.email];
    if(!u||u.name!==findForm.name){ setMsg("일치하는 계정이 없습니다."); return; }
    const tempPw = generateTempPw();
    const key = emailToKey(findForm.email);
    await updateDoc(doc(db,"users",key),{password:tempPw});
    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID,{
        to_email: findForm.email,
        to_name:  u.name,
        temp_password: tempPw
      });
      setMsg(`임시 비밀번호를 ${findForm.email} 로 발송했습니다.`);
    } catch(e) {
      setMsg(`임시 비밀번호: ${tempPw} (이메일 발송 실패 — 직접 전달해주세요)`);
    }
  };

  // ── 휴가 신청 ─────────────────────────────────────────────────────────────
  const handleApply = async () => {
    if(!applyForm.dates.length){ showNotif("휴가 날짜를 선택해주세요."); return; }
    if(!applyForm.approver2){ showNotif("2단계 결재자를 선택해주세요."); return; }
    const dayCount = applyForm.type==="half" ? applyForm.dates.length*0.5 : applyForm.dates.length;
    const u = users[currentUser.email];
    if(dayCount > (u.annualLeave-u.usedLeave)){ showNotif("잔여 연차가 부족합니다."); return; }
    // 신청자=2단계 or 신청자=3단계인 경우 자동 step 올리기
    let autoStep = 1;
    if(applyForm.approver2 === currentUser.email) autoStep = 2; // 2단계 자동통과
    if(applyForm.approver2 === currentUser.email && HR_APPROVER === currentUser.email) autoStep = 3; // 2+3단계 자동통과
    await addDoc(collection(db,"requests"),{
      applicantEmail: currentUser.email,
      applicantName:  currentUser.name,
      dept:           currentUser.dept,
      dates:          [...applyForm.dates].sort(),
      type:           applyForm.type,
      dayCount,
      approver1: currentUser.email,
      approver2: applyForm.approver2,
      approver3: HR_APPROVER,
      approver4: CEO_EMAIL,
      step:   autoStep,
      status: "pending",
      createdAt: new Date().toISOString(),
      approvedAt: null,
    });
    setApplyForm({dates:[],type:"annual",approver2:""});
    showNotif("휴가 신청이 완료되었습니다.");
  };

  // ── 결재 ─────────────────────────────────────────────────────────────────
  const handleApprove = async (r) => {
    const ref = doc(db,"requests",r.id);
    if(r.step===2) await updateDoc(ref,{step:3});
    else if(r.step===3) await updateDoc(ref,{step:4});
    else if(r.step===4){
      await updateDoc(ref,{step:5,status:"approved",approvedAt:new Date().toISOString()});
      const ukey = emailToKey(r.applicantEmail);
      const u = users[r.applicantEmail];
      await updateDoc(doc(db,"users",ukey),{usedLeave:(u.usedLeave||0)+r.dayCount});
    }
  };

  const handleReject = async (r) => {
    await updateDoc(doc(db,"requests",r.id),{status:"rejected",step:-1});
  };

  const handleDeleteReq = async (id) => {
    await deleteDoc(doc(db,"requests",id));
  };

  // ── 내 정보 저장 ──────────────────────────────────────────────────────────
  const handleSaveMyInfo = async () => {
    const u = users[currentUser.email];
    if(myInfoForm.newPw){
      if(myInfoForm.oldPw!==u.password){ showNotif("현재 비밀번호가 틀렸습니다."); return; }
      if(myInfoForm.newPw!==myInfoForm.confirmPw){ showNotif("새 비밀번호가 일치하지 않습니다."); return; }
    }
    const key = emailToKey(currentUser.email);
    const updates = {};
    if(myInfoForm.position) updates.position = myInfoForm.position;
    if(myInfoForm.newPw)    updates.password  = myInfoForm.newPw;
    if(Object.keys(updates).length) await updateDoc(doc(db,"users",key),updates);
    setMyInfoForm({position:"",oldPw:"",newPw:"",confirmPw:""});
    showNotif("저장되었습니다.");
  };

  // ── 연차 저장 (인사담당자) ────────────────────────────────────────────────
  const handleSaveLeave = async (email) => {
    const val = parseInt(editLeave[email]);
    if(isNaN(val)||val<0){ showNotif("올바른 연차 일수를 입력해주세요."); return; }
    await updateDoc(doc(db,"users",emailToKey(email)),{annualLeave:val});
    setEditLeave(p=>{const n={...p};delete n[email];return n;});
    showNotif("연차가 수정되었습니다.");
  };

  // ── 팀장 설정 저장 ────────────────────────────────────────────────────────
  const handleSaveManagerConfig = async () => {
    await setDoc(doc(db,"config","managerConfig"),managerConfig);
    showNotif("팀장 설정이 저장되었습니다.");
  };

  // ── 계산값 ────────────────────────────────────────────────────────────────
  const cu = currentUser ? users[currentUser.email] : null;
  const annualLeave    = cu?.annualLeave ?? 15;
  const usedLeave      = cu?.usedLeave   ?? 0;
  const remainingLeave = annualLeave - usedLeave;

  const getMyApprovalList = () => {
    if(!currentUser) return [];
    const email = currentUser.email;
    const isCeo      = email === CEO_EMAIL;
    const isHr       = email === HR_APPROVER;
    const isHrViewer = email === HR_VIEWER;
    const isManager  = Object.values(managerConfig).includes(email);
    return requests.filter(r=>{
      if(r.applicantEmail === email) return true;
      if(isCeo      && (r.step>=4 || r.status==="approved" || r.status==="rejected")) return true;
      if(isHr       && (r.step>=3 || r.status==="approved" || r.status==="rejected")) return true;
      if(isHrViewer && (r.status==="approved" || r.status==="rejected")) return true;
      if(isManager  && r.approver2===email && (r.step>=2 || r.status==="approved" || r.status==="rejected")) return true;
      return false;
    });
  };

  const canApprove = r => {
    if(!currentUser) return false;
    const email = currentUser.email;
    if(r.applicantEmail === email) return false;
    const isCeo     = email === CEO_EMAIL;
    const isHr      = email === HR_APPROVER;
    const isManager = Object.values(managerConfig).includes(email);
    if(isCeo     && r.step===4) return true;
    if(isHr      && r.step===3) return true;
    if(isManager && r.approver2===email && r.step===2) return true;
    return false;
  };

  const getStepLabel = (step,status) => {
    if(status==="approved") return {label:"승인완료",color:"#1d9e75"};
    if(status==="rejected") return {label:"반려",    color:"#e24b4a"};
    const m={1:"신청완료",2:"1차결재대기",3:"2차결재대기",4:"최종결재대기"};
    return {label:m[step]||"진행중",color:"#378add"};
  };

  const typeLabel = t => t==="half"?"반차(0.5일)":"연차(1일)";

  // ── 로딩 ──────────────────────────────────────────────────────────────────
  if(loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--color-background-tertiary)"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:32,marginBottom:12}}>🏢</div>
        <p style={{fontSize:14,color:"var(--color-text-secondary)"}}>씨스퀘어자산운용(주) 휴가관리 시스템 로딩 중...</p>
      </div>
    </div>
  );

  const cs = { minHeight:"100vh", background:"var(--color-background-tertiary)", fontFamily:"var(--font-sans)", color:"var(--color-text-primary)" };

  // ── 로그인 화면 ───────────────────────────────────────────────────────────
  if(page==="login") return (
    <div style={{...cs,display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem 1rem"}}>
      <div style={{background:"var(--color-background-primary)",borderRadius:"var(--border-radius-lg)",border:"0.5px solid var(--color-border-tertiary)",padding:"2.5rem 2rem",width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:"2rem"}}>
          <div style={{fontSize:28,marginBottom:6}}>🏢</div>
          <h1 style={{fontSize:18,fontWeight:500,margin:0}}>씨스퀘어자산운용(주) 휴가관리</h1>
          <p style={{fontSize:12,color:"var(--color-text-secondary)",margin:"4px 0 0"}}>csquaredasset.com</p>
        </div>

        {authMode==="login" && (<>
          <div style={{marginBottom:10}}>
            <label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>이메일</label>
            <input value={loginForm.email} onChange={e=>setLoginForm(p=>({...p,email:e.target.value}))} placeholder="이메일" style={{width:"100%",boxSizing:"border-box"}} />
          </div>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>비밀번호</label>
            <input type="password" value={loginForm.password} onChange={e=>setLoginForm(p=>({...p,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="비밀번호" style={{width:"100%",boxSizing:"border-box"}} />
          </div>
          {msg&&<p style={{fontSize:12,color:"#e24b4a",marginBottom:8}}>{msg}</p>}
          <button onClick={handleLogin} style={{width:"100%",padding:"10px",background:"#1d9e75",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:500,fontSize:14,marginBottom:12}}>로그인</button>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{setAuthMode("register");setMsg("");}} style={{flex:1,padding:"8px",background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:8,cursor:"pointer",fontSize:13}}>회원가입</button>
            <button onClick={()=>{setAuthMode("findpw");setMsg("");}}   style={{flex:1,padding:"8px",background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:8,cursor:"pointer",fontSize:13}}>비밀번호 찾기</button>
          </div>
        </>)}

        {authMode==="register" && (<>
          <h2 style={{fontSize:16,fontWeight:500,marginBottom:16}}>회원가입</h2>
          {[["email","이메일","text","이메일"],["name","이름","text","이름"],["password","비밀번호","password","비밀번호"],["confirm","비밀번호 확인","password","재입력"]].map(([k,l,t,ph])=>(
            <div key={k} style={{marginBottom:10}}>
              <label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>{l}</label>
              <input type={t} value={regForm[k]} onChange={e=>setRegForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} style={{width:"100%",boxSizing:"border-box"}} />
            </div>
          ))}
          <div style={{marginBottom:16}}>
            <label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>부서명</label>
            <select value={regForm.dept} onChange={e=>setRegForm(p=>({...p,dept:e.target.value}))} style={{width:"100%",boxSizing:"border-box"}}>
              {DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
            </select>
          </div>
          {msg&&<p style={{fontSize:12,color:msg.includes("완료")?"#1d9e75":"#e24b4a",marginBottom:8}}>{msg}</p>}
          <button onClick={handleRegister} style={{width:"100%",padding:"10px",background:"#378add",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:500,fontSize:14,marginBottom:8}}>가입하기</button>
          <button onClick={()=>{setAuthMode("login");setMsg("");}} style={{width:"100%",padding:"8px",background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:8,cursor:"pointer",fontSize:13}}>← 로그인으로</button>
        </>)}

        {authMode==="findpw" && (<>
          <h2 style={{fontSize:16,fontWeight:500,marginBottom:16}}>비밀번호 찾기</h2>
          <div style={{marginBottom:10}}>
            <label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>이메일</label>
            <input value={findForm.email} onChange={e=>setFindForm(p=>({...p,email:e.target.value}))} placeholder="가입한 이메일" style={{width:"100%",boxSizing:"border-box"}} />
          </div>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>이름</label>
            <input value={findForm.name} onChange={e=>setFindForm(p=>({...p,name:e.target.value}))} placeholder="가입한 이름" style={{width:"100%",boxSizing:"border-box"}} />
          </div>
          {msg&&<p style={{fontSize:12,color:msg.includes("발송")?"#1d9e75":"#e24b4a",marginBottom:8}}>{msg}</p>}
          <button onClick={handleFindPw} style={{width:"100%",padding:"10px",background:"#ba7517",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:500,fontSize:14,marginBottom:8}}>임시 비밀번호 받기</button>
          <button onClick={()=>{setAuthMode("login");setMsg("");}} style={{width:"100%",padding:"8px",background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:8,cursor:"pointer",fontSize:13}}>← 로그인으로</button>
        </>)}
      </div>
    </div>
  );

  // ── 메인 앱 ───────────────────────────────────────────────────────────────
  const myList = getMyApprovalList();
  const pendingCount = myList.filter(r=>canApprove(r)).length;

  return (
    <div style={cs}>
      {notif&&(
        <div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:"#1d9e75",color:"#fff",padding:"10px 20px",borderRadius:8,zIndex:9999,fontSize:13,fontWeight:500,boxShadow:"0 2px 12px rgba(0,0,0,0.15)"}}>
          {notif}
        </div>
      )}

      {/* 헤더 */}
      <div style={{background:"var(--color-background-primary)",borderBottom:"0.5px solid var(--color-border-tertiary)",padding:"0 1.5rem",display:"flex",alignItems:"center",justifyContent:"space-between",height:52,position:"sticky",top:0,zIndex:100}}>
        <span style={{fontWeight:500,fontSize:15}}>🏢 씨스퀘어자산운용(주) 휴가관리</span>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>{cu?.name} ({cu?.dept})</span>
          <button onClick={()=>{setCurrentUser(null);setPage("login");setLoginForm({email:"",password:""}); }} style={{fontSize:12,padding:"4px 10px",background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:6,cursor:"pointer"}}>로그아웃</button>
        </div>
      </div>

      {/* 탭 */}
      <div style={{background:"var(--color-background-primary)",borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",padding:"0 1.5rem"}}>
        {[["apply","휴가신청"],["inbox","결재함"],["annual","연차관리"],["myinfo","내 정보"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{
            padding:"12px 18px",background:"none",border:"none",cursor:"pointer",fontSize:14,
            fontWeight:tab===k?500:400,
            color:tab===k?"#1d9e75":"var(--color-text-secondary)",
            borderBottom:tab===k?"2px solid #1d9e75":"2px solid transparent",
            position:"relative"
          }}>
            {l}
            {k==="inbox"&&pendingCount>0&&(
              <span style={{position:"absolute",top:8,right:4,background:"#e24b4a",color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:10,display:"flex",alignItems:"center",justifyContent:"center"}}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      <div style={{padding:"1.5rem",maxWidth:900,margin:"0 auto"}}>

        {/* ── 휴가신청 탭 ── */}
        {tab==="apply" && (
          <div>
            <h2 style={{fontSize:18,fontWeight:500,marginBottom:16}}>휴가신청</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
              {[["부여 연차",annualLeave,"#378add"],["사용 연차",usedLeave,"#ba7517"],["잔여 연차",remainingLeave,"#1d9e75"]].map(([l,v,c])=>(
                <div key={l} style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"1rem",textAlign:"center"}}>
                  <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:4}}>{l}</div>
                  <div style={{fontSize:24,fontWeight:500,color:c}}>{v}일</div>
                </div>
              ))}
            </div>
            <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"1.5rem"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
                <div>
                  <label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>부서명</label>
                  <input value={cu?.dept||""} readOnly style={{width:"100%",boxSizing:"border-box",background:"var(--color-background-secondary)"}} />
                </div>
                <div>
                  <label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>신청자</label>
                  <input value={cu?.name||""} readOnly style={{width:"100%",boxSizing:"border-box",background:"var(--color-background-secondary)"}} />
                </div>
              </div>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:8}}>휴가 종류 <span style={{color:"#e24b4a"}}>*</span></label>
                <div style={{display:"flex",gap:16}}>
                  {[["annual","연차 (1일 차감)"],["half","반차 (0.5일 차감)"]].map(([v,l])=>(
                    <label key={v} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:14}}>
                      <input type="radio" name="lt" value={v} checked={applyForm.type===v} onChange={()=>setApplyForm(p=>({...p,type:v}))} />{l}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:8}}>휴가 날짜 선택 <span style={{color:"#e24b4a"}}>*</span> <span style={{color:"var(--color-text-secondary)"}}>(복수 선택 가능)</span></label>
                <Calendar selectedDates={applyForm.dates} onToggleDate={key=>setApplyForm(p=>({...p,dates:p.dates.includes(key)?p.dates.filter(d=>d!==key):[...p.dates,key]}))} />
                {applyForm.dates.length>0&&(
                  <p style={{fontSize:12,color:"var(--color-text-secondary)",marginTop:6}}>선택 {applyForm.dates.length}일 → 차감 <strong>{applyForm.type==="half"?applyForm.dates.length*0.5:applyForm.dates.length}일</strong></p>
                )}
              </div>
              <div style={{marginBottom:20,padding:"1rem",background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-md)"}}>
                <h3 style={{fontSize:14,fontWeight:500,marginBottom:12}}>결재라인</h3>
                {(()=>{
                  const isSelfHR = currentUser?.email === HR_APPROVER;
                  const rows = [
                    {step:"1단계 (신청자)",    val: cu?.name,                   readonly: true,  auto: false},
                    {step:"2단계 (부서 팀장)", val: null,                        readonly: false, auto: isSelfHR && applyForm.approver2===currentUser?.email},
                    {step:"3단계 (인사담당자)",val: getUserName(HR_APPROVER),    readonly: true,  auto: isSelfHR},
                    {step:"4단계 (대표이사)",  val: getUserName(CEO_EMAIL),      readonly: true,  auto: false},
                  ];
                  return rows.map(({step,val,readonly,auto},i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
                      <span style={{fontSize:12,color:"var(--color-text-secondary)",minWidth:120}}>{step}</span>
                      {auto ? (
                        <input value="✓ 자동 통과" readOnly style={{flex:1,background:"#e1f5ee",boxSizing:"border-box",color:"#0f6e56",fontWeight:500}} />
                      ) : readonly ? (
                        <input value={val||""} readOnly style={{flex:1,background:"var(--color-background-tertiary)",boxSizing:"border-box"}} />
                      ) : (
                        <select value={applyForm.approver2} onChange={e=>setApplyForm(p=>({...p,approver2:e.target.value}))} style={{flex:1,boxSizing:"border-box"}}>
                          <option value="">팀장 선택</option>
                          {Object.entries(managerConfig).map(([dept,email])=>(
                            <option key={email} value={email}>{dept}장 ({getUserName(email) !== email ? getUserName(email) : dept+"장"})</option>
                          ))}
                        </select>
                      )}
                    </div>
                  ));
                })()}
              </div>
              <button onClick={handleApply} style={{width:"100%",padding:"12px",background:"#1d9e75",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:500,fontSize:15}}>휴가 신청하기</button>
            </div>
          </div>
        )}

        {/* ── 결재함 탭 ── */}
        {tab==="inbox" && (
          <div>
            <h2 style={{fontSize:18,fontWeight:500,marginBottom:16}}>결재함</h2>
            {myList.length===0 ? (
              <div style={{textAlign:"center",padding:"3rem",color:"var(--color-text-secondary)",fontSize:14}}>결재함이 비어있습니다.</div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {myList.map(r=>{
                  const si = getStepLabel(r.step,r.status);
                  const isHR = getUserRole(currentUser?.email)==="hr";
                  return (
                    <div key={r.id} style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"1rem 1.25rem"}}>
                      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                            <span style={{fontWeight:500,fontSize:14}}>{r.applicantName}</span>
                            <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>({r.dept})</span>
                            <span style={{fontSize:11,padding:"2px 8px",borderRadius:12,background:si.color+"22",color:si.color,fontWeight:500}}>{si.label}</span>
                          </div>
                          <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:4}}>
                            📅 {(r.dates||[]).join(", ")} &nbsp;|&nbsp; {typeLabel(r.type)} &nbsp;|&nbsp; <strong style={{color:"var(--color-text-primary)"}}>{r.dayCount}일</strong>
                          </div>
                          <div style={{fontSize:12,color:"var(--color-text-secondary)"}}>
                            결재라인: {r.applicantName} → {getUserName(r.approver2)} → {getUserName(r.approver3)} → {getUserName(r.approver4)}
                          </div>
                          {r.status==="approved"&&(
                            <div style={{marginTop:6,padding:"6px 10px",background:"#e1f5ee",borderRadius:6,fontSize:12,color:"#0f6e56",fontWeight:500}}>
                              ✅ 해당 휴가사용은 승인되었습니다. ({formatDate(r.approvedAt)})
                            </div>
                          )}
                          {r.status==="rejected"&&(
                            <div style={{marginTop:6,padding:"6px 10px",background:"#fcebeb",borderRadius:6,fontSize:12,color:"#a32d2d",fontWeight:500}}>
                              ❌ 반려되었습니다.
                            </div>
                          )}
                        </div>
                        <div style={{display:"flex",gap:6,flexShrink:0,flexDirection:"column",alignItems:"flex-end"}}>
                          {canApprove(r)&&(
                            <div style={{display:"flex",gap:6}}>
                              <button onClick={()=>handleApprove(r)} style={{padding:"6px 12px",background:"#1d9e75",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:500}}>결재하기</button>
                              <button onClick={()=>handleReject(r)}  style={{padding:"6px 12px",background:"#e24b4a",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:12}}>반려</button>
                            </div>
                          )}
                          {r.status==="approved"&&(
                            <button onClick={()=>generatePDF(r,getUserName)} style={{padding:"6px 12px",background:"#e6f1fb",color:"#185fa5",border:"0.5px solid #b5d4f4",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:500,display:"flex",alignItems:"center",gap:4}}>
                              📄 기안문서 PDF
                            </button>
                          )}
                          {isHR&&(
                            <button onClick={()=>handleDeleteReq(r.id)} style={{padding:"6px 10px",background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:6,cursor:"pointer",fontSize:12,color:"var(--color-text-secondary)"}}>🗑</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 연차관리 탭 ── */}
        {tab==="annual" && (()=>{
          const myEmail = currentUser?.email;
          const isHRUser  = myEmail === HR_APPROVER || myEmail === HR_VIEWER;
          const isCEOUser = myEmail === CEO_EMAIL;
          const isAdmin   = isHRUser || isCEOUser;
          return (
          <div>
            <h2 style={{fontSize:18,fontWeight:500,marginBottom:16}}>연차관리</h2>
            {isAdmin ? (
              <div>
                <p style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:16}}>
                  {myEmail===HR_APPROVER ? "💼 인사담당자 (강수민) — 전체 직원 연차 조회 및 수정" : myEmail===HR_VIEWER ? "💼 인사담당자 (jsw) — 전체 직원 연차 조회 및 수정" : "👔 대표이사 — 전체 직원 연차 조회"}
                </p>
                <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",overflow:"hidden",marginBottom:24}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead>
                      <tr style={{background:"var(--color-background-secondary)"}}>
                        {["이름","부서","이메일","부여연차","사용연차","잔여연차"].map(h=>(
                          <th key={h} style={{padding:"10px 12px",textAlign:"left",fontWeight:500,fontSize:12,color:"var(--color-text-secondary)",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(users).map(([email,u])=>{
                        const rem = (u.annualLeave||0)-(u.usedLeave||0);
                        const keyA = email+":annual";
                        const keyU = email+":used";
                        return (
                          <tr key={email} style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                            <td style={{padding:"10px 12px",fontWeight:500}}>{u.name}</td>
                            <td style={{padding:"10px 12px",color:"var(--color-text-secondary)"}}>{u.dept}</td>
                            <td style={{padding:"10px 12px",color:"var(--color-text-secondary)",fontSize:11}}>{email}</td>
                            {/* 부여연차 */}
                            <td style={{padding:"8px 12px"}}>
                              {isHRUser && editLeave[keyA]!==undefined ? (
                                <div style={{display:"flex",gap:4,alignItems:"center"}}>
                                  <input type="number" value={editLeave[keyA]} onChange={e=>setEditLeave(p=>({...p,[keyA]:e.target.value}))} style={{width:55,padding:"3px 5px"}} min={0} />
                                  <button onClick={async()=>{
                                    const val=parseInt(editLeave[keyA]);
                                    if(isNaN(val)||val<0){showNotif("올바른 값을 입력해주세요.");return;}
                                    await updateDoc(doc(db,"users",emailToKey(email)),{annualLeave:val});
                                    setEditLeave(p=>{const n={...p};delete n[keyA];return n;});
                                    showNotif("부여연차 수정 완료!");
                                  }} style={{padding:"3px 7px",background:"#1d9e75",color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontSize:11}}>저장</button>
                                  <button onClick={()=>setEditLeave(p=>{const n={...p};delete n[keyA];return n;})} style={{padding:"3px 7px",background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:4,cursor:"pointer",fontSize:11}}>취소</button>
                                </div>
                              ) : (
                                <div style={{display:"flex",alignItems:"center",gap:6}}>
                                  <span style={{color:"#378add",fontWeight:500}}>{u.annualLeave||0}일</span>
                                  {isHRUser && <button onClick={()=>setEditLeave(p=>({...p,[keyA]:u.annualLeave||0}))} style={{padding:"2px 6px",background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:4,cursor:"pointer",fontSize:10,color:"var(--color-text-secondary)"}}>수정</button>}
                                </div>
                              )}
                            </td>
                            {/* 사용연차 */}
                            <td style={{padding:"8px 12px"}}>
                              {isHRUser && editLeave[keyU]!==undefined ? (
                                <div style={{display:"flex",gap:4,alignItems:"center"}}>
                                  <input type="number" value={editLeave[keyU]} onChange={e=>setEditLeave(p=>({...p,[keyU]:e.target.value}))} style={{width:55,padding:"3px 5px"}} min={0} />
                                  <button onClick={async()=>{
                                    const val=parseInt(editLeave[keyU]);
                                    if(isNaN(val)||val<0){showNotif("올바른 값을 입력해주세요.");return;}
                                    await updateDoc(doc(db,"users",emailToKey(email)),{usedLeave:val});
                                    setEditLeave(p=>{const n={...p};delete n[keyU];return n;});
                                    showNotif("사용연차 수정 완료!");
                                  }} style={{padding:"3px 7px",background:"#ba7517",color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontSize:11}}>저장</button>
                                  <button onClick={()=>setEditLeave(p=>{const n={...p};delete n[keyU];return n;})} style={{padding:"3px 7px",background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:4,cursor:"pointer",fontSize:11}}>취소</button>
                                </div>
                              ) : (
                                <div style={{display:"flex",alignItems:"center",gap:6}}>
                                  <button onClick={()=>setTab("inbox")} style={{background:"none",border:"none",cursor:"pointer",color:"#ba7517",fontWeight:500,textDecoration:"underline",fontSize:13,padding:0}}>{u.usedLeave||0}일</button>
                                  {isHRUser && <button onClick={()=>setEditLeave(p=>({...p,[keyU]:u.usedLeave||0}))} style={{padding:"2px 6px",background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:4,cursor:"pointer",fontSize:10,color:"var(--color-text-secondary)"}}>수정</button>}
                                </div>
                              )}
                            </td>
                            <td style={{padding:"10px 12px",color:rem<3?"#e24b4a":"#1d9e75",fontWeight:500}}>{rem}일</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* 팀장 이메일 관리 — 인사담당자만 */}
                {isHRUser && (
                <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"1.25rem"}}>
                  <h3 style={{fontSize:15,fontWeight:500,marginBottom:12}}>팀장 이메일 관리</h3>
                  {Object.entries(managerConfig).map(([dept,email])=>(
                    <div key={dept} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                      <span style={{fontSize:13,minWidth:110,color:"var(--color-text-secondary)"}}>{dept}장</span>
                      <input value={email} onChange={e=>setManagerConfig(p=>({...p,[dept]:e.target.value}))} style={{flex:1,fontSize:12,boxSizing:"border-box"}} />
                    </div>
                  ))}
                  <button onClick={handleSaveManagerConfig} style={{marginTop:8,padding:"7px 16px",background:"#1d9e75",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:13,fontWeight:500}}>저장</button>
                </div>
                )}
              </div>
            ) : (
              <div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
                  {[["부여 연차",annualLeave,"#378add"],["사용 연차",usedLeave,"#ba7517"],["잔여 연차",remainingLeave,"#1d9e75"]].map(([l,v,c])=>(
                    <div key={l} style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"1.5rem",textAlign:"center"}}>
                      <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:6}}>{l}</div>
                      <div style={{fontSize:28,fontWeight:500,color:c}}>{v}일</div>
                    </div>
                  ))}
                </div>
                <button onClick={()=>setTab("inbox")} style={{fontSize:13,color:"#378add",background:"none",border:"0.5px solid #378add",borderRadius:6,padding:"6px 14px",cursor:"pointer"}}>사용 연차 내역 보기 →</button>
              </div>
            )}
          </div>
          );
        })()}

        {/* ── 내 정보 탭 ── */}
        {tab==="myinfo" && (
          <div>
            <h2 style={{fontSize:18,fontWeight:500,marginBottom:16}}>내 정보</h2>
            <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"1.5rem",maxWidth:480}}>
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20,paddingBottom:16,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                <div style={{width:50,height:50,borderRadius:"50%",background:"#e1f5ee",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:500,color:"#0f6e56"}}>{cu?.name?.[0]}</div>
                <div>
                  <div style={{fontWeight:500,fontSize:16}}>{cu?.name}</div>
                  <div style={{fontSize:12,color:"var(--color-text-secondary)"}}>{currentUser?.email}</div>
                </div>
              </div>
              {[["부서",cu?.dept||""],["이메일",currentUser?.email||""],["직급",cu?.position||"(미입력)"]].map(([l,v])=>(
                <div key={l} style={{display:"flex",gap:12,marginBottom:10,alignItems:"center"}}>
                  <span style={{fontSize:12,color:"var(--color-text-secondary)",minWidth:60}}>{l}</span>
                  <input value={v} readOnly style={{flex:1,background:"var(--color-background-secondary)",boxSizing:"border-box"}} />
                </div>
              ))}
              <div style={{display:"flex",gap:12,marginBottom:16,alignItems:"center"}}>
                <span style={{fontSize:12,color:"var(--color-text-secondary)",minWidth:60}}>직급 수정</span>
                <input value={myInfoForm.position} onChange={e=>setMyInfoForm(p=>({...p,position:e.target.value}))} placeholder="직급 입력" style={{flex:1,boxSizing:"border-box"}} />
              </div>
              <div style={{borderTop:"0.5px solid var(--color-border-tertiary)",paddingTop:16,marginTop:8}}>
                <h3 style={{fontSize:14,fontWeight:500,marginBottom:10}}>비밀번호 변경</h3>
                {[["oldPw","현재 비밀번호"],["newPw","새 비밀번호"],["confirmPw","새 비밀번호 확인"]].map(([k,l])=>(
                  <div key={k} style={{marginBottom:8}}>
                    <label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:3}}>{l}</label>
                    <input type="password" value={myInfoForm[k]} onChange={e=>setMyInfoForm(p=>({...p,[k]:e.target.value}))} placeholder={l} style={{width:"100%",boxSizing:"border-box"}} />
                  </div>
                ))}
              </div>
              <button onClick={handleSaveMyInfo} style={{width:"100%",padding:"10px",background:"#1d9e75",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:500,fontSize:14,marginTop:12}}>저장하기</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
