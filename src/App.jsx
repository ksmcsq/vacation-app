// ─── Firebase + EmailJS 연동 버전 ──────────────────────────────────────────────
// Firebase config (csquared-vacation 프로젝트)
import { useState, useEffect, useCallback } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, doc, setDoc, getDoc, getDocs,
  collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBFDDpDgUrCWxUPeUw28j0F1T9mLmjtDVk",
  authDomain: "csquared-vacation.firebaseapp.com",
  projectId: "csquared-vacation",
  storageBucket: "csquared-vacation.firebasestorage.app",
  messagingSenderId: "16834141553",
  appId: "1:16834141553:web:17e779ed6e725b6990aad0"
};



const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

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
// UserCard는 App 내부에서 렌더링

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
          <div key={w} style={{fontSize:11,fontWeight:500,color:i===0?"#e24b4a":i===6?"#2E6DA4":"var(--color-text-secondary)",padding:"4px 0"}}>{w}</div>
        ))}
        {cells.map((d,i)=>(
          <div key={i} onClick={()=>toggle(d)} style={{
            padding:"6px 2px",fontSize:13,borderRadius:6,cursor:d?"pointer":"default",
            background:d&&isSelected(d)?"#1B5E45":"transparent",
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
  const [regForm,   setRegForm]   = useState({email:"",name:"",dept:"자산운용파트",position:"팀원",password:"",confirm:""});
  const [findForm,  setFindForm]  = useState({email:"",name:""});
  const [applyForm, setApplyForm] = useState({dates:[],type:"annual",approver2:""});
  const [myInfoForm,setMyInfoForm]= useState({position:"",oldPw:"",newPw:"",confirmPw:""});
  const [editLeave, setEditLeave] = useState({});
  const [leaveSearch, setLeaveSearch] = useState("");
  const [adminPwReset, setAdminPwReset] = useState({email:"",newPw:"",confirm:""});

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
      position:regForm.position||"팀원"
    });
    setMsg("회원가입이 완료되었습니다. 로그인해 주세요.");
    setAuthMode("login");
    setRegForm({email:"",name:"",dept:"자산운용파트",password:"",confirm:""});
  };



  // ── 휴가 신청 ─────────────────────────────────────────────────────────────
  const handleApply = async () => {
    if(!applyForm.dates.length){ showNotif("휴가 날짜를 선택해주세요."); return; }
    if(!applyForm.approver2){ showNotif("2단계 결재자를 선택해주세요."); return; }
    const dayCount = applyForm.type==="half" ? applyForm.dates.length*0.5 : applyForm.dates.length;
    const u = users[currentUser.email];
    const annualLeave = u?.annualLeave ?? 15;
    const usedLeave   = u?.usedLeave   ?? 0;
    if(dayCount > (annualLeave - usedLeave)){ showNotif("잔여 연차가 부족합니다."); return; }
    // 신청자=팀장(2단계) 동일인이면 자동 통과
    // 신청자=팀장=인사담당자 모두 동일인이면 바로 대표이사(3단계)로
    let autoStep = 1;
    const isSelfManager = applyForm.approver2 === currentUser.email;
    const isSelfHR      = HR_APPROVER === currentUser.email;
    if(isSelfManager && isSelfHR) autoStep = 3; // 2+3단계 모두 자동통과 → 대표이사 대기
    else if(isSelfManager)        autoStep = 2; // 2단계만 자동통과 → 인사담당자 대기
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
    const step = typeof r.step === "string" ? parseInt(r.step) : r.step;

    // step 1 또는 2: 팀장 결재
    if(step===1 || step===2){
      // 인사담당자(approver3)가 본인이면 자동통과 → 바로 대표이사(step:4)
      if(r.approver3 === currentUser.email){
        await updateDoc(ref,{step:4});
      } else {
        await updateDoc(ref,{step:3});
      }
    }
    // step 3: 인사담당자 결재 → 대표이사로
    else if(step===3){
      await updateDoc(ref,{step:4});
    }
    // step 4: 대표이사 최종 승인
    else if(step===4){
      await updateDoc(ref,{step:5, status:"approved", approvedAt:new Date().toISOString()});
      const ukey = emailToKey(r.applicantEmail);
      const u = users[r.applicantEmail];
      await updateDoc(doc(db,"users",ukey),{usedLeave:(u?.usedLeave||0)+r.dayCount});
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
    const email      = currentUser.email;
    const isCeo      = email === CEO_EMAIL;
    const isHr       = email === HR_APPROVER;
    const isHrViewer = email === HR_VIEWER;
    const isManager  = Object.values(managerConfig).includes(email);
    return requests.filter(r=>{
      const s = typeof r.step==="string" ? parseInt(r.step) : r.step;
      const done = r.status==="approved" || r.status==="rejected";
      // 1. 본인 신청 건은 항상 표시
      if(r.applicantEmail === email) return true;
      // 2. 팀장: approver2가 본인이고 step 1~2 또는 완료
      if(isManager && r.approver2===email && (s===1 || s===2 || done)) return true;
      // 3. 인사담당자: step 3 또는 완료
      if(isHr && (s===3 || done)) return true;
      // 4. 대표이사: step 4 또는 완료
      if(isCeo && (s===4 || done)) return true;
      // 5. HR뷰어: 완료건만
      if(isHrViewer && done) return true;
      return false;
    });
  };

  const canApprove = r => {
    if(!currentUser) return false;
    const email = currentUser.email;
    if(r.applicantEmail === email) return false;
    if(r.status !== "pending") return false;
    const s = typeof r.step==="string" ? parseInt(r.step) : r.step;
    const isCeo     = email === CEO_EMAIL;
    const isHr      = email === HR_APPROVER;
    const isManager = Object.values(managerConfig).includes(email);
    if(isManager && r.approver2===email && (s===1 || s===2)) return true;
    if(isHr && s===3) return true;
    if(isCeo && s===4) return true;
    return false;
  };

  const getStepLabel = (step,status) => {
    if(status==="approved") return {label:"승인완료",  color:"#1B5E45"};
    if(status==="rejected") return {label:"반려",      color:"#e24b4a"};
    const m={
      1:"팀장결재대기",
      2:"팀장결재대기",
      3:"인사담당자결재대기",
      4:"대표이사결재대기",
      5:"승인완료"
    };
    return {label:m[step]||"진행중", color:"#2E6DA4"};
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

  const cs = { minHeight:"100vh", background:"#F4F3F0", fontFamily:"'Inter', 'Pretendard', -apple-system, sans-serif", color:"#2C2C2C" };

  // ── 로그인 화면 ───────────────────────────────────────────────────────────
  if(page==="login") return (
    <div style={{...cs,display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem 1rem",background:"#F4F3F0"}}>
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
          <button onClick={handleLogin} style={{width:"100%",padding:"11px",background:"#1B5E45",color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontWeight:500,fontSize:14,marginBottom:12,letterSpacing:"0.5px"}}>로그인</button>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{setAuthMode("register");setMsg("");}} style={{flex:1,padding:"8px",background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:8,cursor:"pointer",fontSize:13}}>회원가입</button>
          </div>
          <p style={{fontSize:12,color:"var(--color-text-secondary)",textAlign:"center",marginTop:12,lineHeight:1.6}}>
            비밀번호를 잊으셨나요?<br/>
            인사담당자(강수민, ksm@csquaredasset.com)에게 문의해주세요.
          </p>
        </>)}

        {authMode==="register" && (<>
          <h2 style={{fontSize:16,fontWeight:500,marginBottom:16}}>회원가입</h2>
          {[["email","이메일","text","이메일"],["name","이름","text","이름"],["password","비밀번호","password","비밀번호"],["confirm","비밀번호 확인","password","재입력"]].map(([k,l,t,ph])=>(
            <div key={k} style={{marginBottom:10}}>
              <label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>{l}</label>
              <input type={t} value={regForm[k]} onChange={e=>setRegForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} style={{width:"100%",boxSizing:"border-box"}} />
            </div>
          ))}
          <div style={{marginBottom:10}}>
            <label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>부서명</label>
            <select value={regForm.dept} onChange={e=>setRegForm(p=>({...p,dept:e.target.value}))} style={{width:"100%",boxSizing:"border-box"}}>
              {DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
            </select>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>직책</label>
            <select value={regForm.position} onChange={e=>setRegForm(p=>({...p,position:e.target.value}))} style={{width:"100%",boxSizing:"border-box"}}>
              <option value="팀원">팀원</option>
              <option value="팀장">팀장</option>
            </select>
          </div>
          {msg&&<p style={{fontSize:12,color:msg.includes("완료")?"#1B5E45":"#e24b4a",marginBottom:8}}>{msg}</p>}
          <button onClick={handleRegister} style={{width:"100%",padding:"10px",background:"#1B5E45",color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontWeight:500,fontSize:14,marginBottom:8,letterSpacing:"0.5px"}}>가입하기</button>
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
        <div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:"#1B5E45",color:"#fff",padding:"10px 20px",borderRadius:8,zIndex:9999,fontSize:13,fontWeight:500,boxShadow:"0 2px 12px rgba(0,0,0,0.15)"}}>
          {notif}
        </div>
      )}

      {/* 헤더 */}
      <div style={{background:"#1B5E45",padding:"0 1.25rem",display:"flex",alignItems:"center",justifyContent:"space-between",height:56,position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 12px rgba(0,0,0,0.15)"}}>
        <img src='data:image/jpeg;base64,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' alt="Csquared" style={{height:26,objectFit:"contain",filter:"brightness(0) invert(1) sepia(1) saturate(0) brightness(2)"}} />
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:12,fontWeight:500,color:"#ffffff"}}>{cu?.name}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.65)"}}>{cu?.dept}</div>
          </div>
          <button onClick={()=>{setCurrentUser(null);setPage("login");setLoginForm({email:"",password:""});}} style={{fontSize:11,padding:"5px 12px",background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:4,cursor:"pointer",color:"#fff",letterSpacing:"0.5px"}}>로그아웃</button>
        </div>
      </div>

      {/* 탭 */}
      <div style={{background:"#ffffff",borderBottom:"1px solid #e2dfd8",display:"flex"}}>
        {[["apply","휴가신청"],["inbox","결재함"],["annual","연차관리"],["myinfo","내 정보"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{
            flex:1,padding:"14px 4px",background:"none",border:"none",cursor:"pointer",fontSize:12,
            fontWeight:tab===k?600:400,
            color:tab===k?"#1B5E45":"#999",
            borderBottom:tab===k?"2.5px solid #1B5E45":"2.5px solid transparent",
            letterSpacing:"0.3px",position:"relative",transition:"color 0.2s"
          }}>
            {l}
            {k==="inbox"&&pendingCount>0&&(
              <span style={{position:"absolute",top:8,right:"calc(50% - 22px)",background:"#C0392B",color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      <div style={{padding:"1.25rem 1rem",maxWidth:920,margin:"0 auto"}}>

        {/* ── 휴가신청 탭 ── */}
        {tab==="apply" && (
          <div>
            <h2 style={{fontSize:16,fontWeight:600,marginBottom:16,color:"#2C2C2C",letterSpacing:"0.3px",paddingBottom:10,borderBottom:"2px solid #1B5E45"}}>휴가신청</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
              {[["부여 연차",annualLeave,"#2E6DA4"],["사용 연차",usedLeave,"#ba7517"],["잔여 연차",remainingLeave,"#1B5E45"]].map(([l,v,c])=>(
                <div key={l} style={{background:"#ffffff",border:"1px solid #e8e5e0",borderRadius:4,padding:"0.75rem",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                  <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:4}}>{l}</div>
                  <div style={{fontSize:20,fontWeight:500,color:c}}>{v}일</div>
                </div>
              ))}
            </div>
            <div style={{background:"#ffffff",border:"1px solid #e8e5e0",borderRadius:4,padding:"1.5rem",boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
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
              <div style={{marginBottom:20,padding:"1rem",background:"#F8F7F5",borderRadius:4,border:"1px solid #e8e5e0"}}>
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
                        <input value="✓ 자동 통과" readOnly style={{flex:1,background:"#EAF3EE",boxSizing:"border-box",color:"#1B5E45",fontWeight:500}} />
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
              <button onClick={handleApply} style={{width:"100%",padding:"13px",background:"#1B5E45",color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontWeight:500,fontSize:14,letterSpacing:"0.5px"}}>휴가 신청하기</button>
            </div>
          </div>
        )}

        {/* ── 결재함 탭 ── */}
        {tab==="inbox" && (
          <div>
            <h2 style={{fontSize:16,fontWeight:600,marginBottom:16,color:"#2C2C2C",letterSpacing:"0.3px",paddingBottom:10,borderBottom:"2px solid #1B5E45"}}>결재함</h2>
            {myList.length===0 ? (
              <div style={{textAlign:"center",padding:"3rem",color:"var(--color-text-secondary)",fontSize:14}}>결재함이 비어있습니다.</div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {myList.map(r=>{
                  const si = getStepLabel(r.step,r.status);
                  const isHR = getUserRole(currentUser?.email)==="hr";
                  return (
                    <div key={r.id} style={{background:"#ffffff",border:"1px solid #e8e5e0",borderRadius:4,padding:"1rem 1.25rem",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
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
                            <div style={{marginTop:6,padding:"6px 10px",background:"#EAF3EE",borderRadius:6,fontSize:12,color:"#1B5E45",fontWeight:500}}>
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
                              <button onClick={()=>handleApprove(r)} style={{padding:"6px 12px",background:"#1B5E45",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:500}}>결재하기</button>
                              <button onClick={()=>handleReject(r)}  style={{padding:"6px 12px",background:"#C0392B",color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontSize:12,letterSpacing:"0.3px"}}>반려</button>
                            </div>
                          )}
                          {r.status==="approved"&&(
                            <button onClick={()=>generatePDF(r,getUserName)} style={{padding:"6px 12px",background:"#EAF0F7",color:"#2E6DA4",border:"1px solid #C5D8EA",borderRadius:4,cursor:"pointer",fontSize:12,fontWeight:500,display:"flex",alignItems:"center",gap:4}}>
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
          const canEdit   = isHRUser;

          // 검색 필터
          const allUsers = Object.entries(users);
          const searchResult = leaveSearch.trim()
            ? allUsers.filter(([,u]) =>
                u.name?.includes(leaveSearch) ||
                u.dept?.includes(leaveSearch) ||
                u.position?.includes(leaveSearch)
              )
            : [];
          const otherUsers = leaveSearch.trim()
            ? allUsers.filter(([,u]) =>
                !u.name?.includes(leaveSearch) &&
                !u.dept?.includes(leaveSearch) &&
                !u.position?.includes(leaveSearch)
              )
            : allUsers;

          const handleResetAllLeave = async () => {
            if(!window.confirm("전직원 사용연차를 0으로 초기화하시겠습니까?\n(부여연차는 유지됩니다)")) return;
            for(const [email] of allUsers){
              await updateDoc(doc(db,"users",emailToKey(email)),{usedLeave:0});
            }
            showNotif("전직원 연차가 초기화되었습니다!");
          };

          const renderUserRow = ([email,u]) => {
            const rem = (u.annualLeave||0)-(u.usedLeave||0);
            const keyA = email+":annual";
            const keyU = email+":used";
            return (
              <tr key={email} style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                <td style={{padding:"10px 12px",fontWeight:500}}>{u.name}</td>
                <td style={{padding:"10px 12px",color:"var(--color-text-secondary)"}}>{u.position||"-"}</td>
                <td style={{padding:"10px 12px",color:"var(--color-text-secondary)"}}>{u.dept}</td>
                <td style={{padding:"10px 12px",color:"var(--color-text-secondary)",fontSize:11}}>{email}</td>
                {/* 부여연차 */}
                <td style={{padding:"8px 12px"}}>
                  {canEdit && editLeave[keyA]!==undefined ? (
                    <div style={{display:"flex",gap:4,alignItems:"center"}}>
                      <input type="number" value={editLeave[keyA]} onChange={e=>setEditLeave(p=>({...p,[keyA]:e.target.value}))} style={{width:50,padding:"3px 5px"}} min={0} />
                      <button onClick={async()=>{
                        const val=parseInt(editLeave[keyA]);
                        if(isNaN(val)||val<0){showNotif("올바른 값을 입력해주세요.");return;}
                        await updateDoc(doc(db,"users",emailToKey(email)),{annualLeave:val});
                        setEditLeave(p=>{const n={...p};delete n[keyA];return n;});
                        showNotif("부여연차 수정 완료!");
                      }} style={{padding:"3px 6px",background:"#1B5E45",color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontSize:11}}>저장</button>
                      <button onClick={()=>setEditLeave(p=>{const n={...p};delete n[keyA];return n;})} style={{padding:"3px 6px",background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:4,cursor:"pointer",fontSize:11}}>취소</button>
                    </div>
                  ) : (
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{color:"#2E6DA4",fontWeight:500}}>{u.annualLeave||0}일</span>
                      {canEdit && <button onClick={()=>setEditLeave(p=>({...p,[keyA]:u.annualLeave||0}))} style={{padding:"2px 5px",background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:4,cursor:"pointer",fontSize:10,color:"var(--color-text-secondary)"}}>수정</button>}
                    </div>
                  )}
                </td>
                {/* 사용연차 */}
                <td style={{padding:"8px 12px"}}>
                  {canEdit && editLeave[keyU]!==undefined ? (
                    <div style={{display:"flex",gap:4,alignItems:"center"}}>
                      <input type="number" value={editLeave[keyU]} onChange={e=>setEditLeave(p=>({...p,[keyU]:e.target.value}))} style={{width:50,padding:"3px 5px"}} min={0} />
                      <button onClick={async()=>{
                        const val=parseInt(editLeave[keyU]);
                        if(isNaN(val)||val<0){showNotif("올바른 값을 입력해주세요.");return;}
                        await updateDoc(doc(db,"users",emailToKey(email)),{usedLeave:val});
                        setEditLeave(p=>{const n={...p};delete n[keyU];return n;});
                        showNotif("사용연차 수정 완료!");
                      }} style={{padding:"3px 6px",background:"#ba7517",color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontSize:11}}>저장</button>
                      <button onClick={()=>setEditLeave(p=>{const n={...p};delete n[keyU];return n;})} style={{padding:"3px 6px",background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:4,cursor:"pointer",fontSize:11}}>취소</button>
                    </div>
                  ) : (
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <button onClick={()=>setTab("inbox")} style={{background:"none",border:"none",cursor:"pointer",color:"#ba7517",fontWeight:500,textDecoration:"underline",fontSize:13,padding:0}}>{u.usedLeave||0}일</button>
                      {canEdit && <button onClick={()=>setEditLeave(p=>({...p,[keyU]:u.usedLeave||0}))} style={{padding:"2px 5px",background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:4,cursor:"pointer",fontSize:10,color:"var(--color-text-secondary)"}}>수정</button>}
                    </div>
                  )}
                </td>
                <td style={{padding:"10px 12px",color:rem<3?"#e24b4a":"#1B5E45",fontWeight:500}}>{rem}일</td>
              </tr>
            );
          };

          return (
          <div>
            <h2 style={{fontSize:16,fontWeight:600,marginBottom:16,color:"#2C2C2C",letterSpacing:"0.3px",paddingBottom:10,borderBottom:"2px solid #1B5E45"}}>연차관리</h2>
            {isAdmin ? (
              <div>
                {/* 상단: 설명 + 초기화 버튼 */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                  <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:0}}>
                    {myEmail===HR_APPROVER ? "💼 인사담당자 (강수민) — 전체 직원 연차 조회 및 수정" : myEmail===HR_VIEWER ? "💼 인사담당자 (jsw) — 전체 직원 연차 조회 및 수정" : "👔 대표이사 — 전체 직원 연차 조회"}
                  </p>
                  {canEdit && (
                    <button onClick={handleResetAllLeave} style={{padding:"7px 14px",background:"#C0392B",color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontSize:12,fontWeight:500,flexShrink:0,letterSpacing:"0.3px"}}>
                      🔄 연차 초기화
                    </button>
                  )}
                </div>
                {/* 검색란 */}
                <div style={{marginBottom:12}}>
                  <input
                    value={leaveSearch}
                    onChange={e=>setLeaveSearch(e.target.value)}
                    placeholder="🔍 이름, 부서, 직책으로 검색..."
                    style={{width:"100%",boxSizing:"border-box",padding:"8px 12px",fontSize:13}}
                  />
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:24}}>
                  {(()=>{
                    const renderCard = ([email,u]) => {
                      const rem2 = (u.annualLeave||0)-(u.usedLeave||0);
                      const kA = email+":annual";
                      const kU = email+":used";
                      return (
                        <div key={email} style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"12px 14px"}}>
                          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8,flexWrap:"wrap",gap:4}}>
                            <div>
                              <span style={{fontWeight:500,fontSize:14}}>{u.name}</span>
                              <span style={{marginLeft:6,fontSize:11,padding:"2px 7px",background:"var(--color-background-secondary)",borderRadius:10,color:"var(--color-text-secondary)"}}>{u.position||"-"}</span>
                              <span style={{marginLeft:6,fontSize:12,color:"var(--color-text-secondary)"}}>{u.dept}</span>
                            </div>
                            <span style={{fontSize:10,color:"var(--color-text-secondary)"}}>{email}</span>
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                            <div style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"8px",textAlign:"center"}}>
                              <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:4}}>부여연차</div>
                              {canEdit && editLeave[kA]!==undefined ? (
                                <div style={{display:"flex",flexDirection:"column",gap:3}}>
                                  <input type="number" value={editLeave[kA]} onChange={e=>setEditLeave(p=>({...p,[kA]:e.target.value}))} style={{width:"100%",padding:"3px",textAlign:"center",boxSizing:"border-box"}} min={0} />
                                  <div style={{display:"flex",gap:3}}>
                                    <button onClick={async()=>{const val=parseInt(editLeave[kA]);if(isNaN(val)||val<0)return;await updateDoc(doc(db,"users",emailToKey(email)),{annualLeave:val});setEditLeave(p=>{const n={...p};delete n[kA];return n;});showNotif("저장!");}} style={{flex:1,padding:"3px",background:"#1B5E45",color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontSize:10}}>저장</button>
                                    <button onClick={()=>setEditLeave(p=>{const n={...p};delete n[kA];return n;})} style={{flex:1,padding:"3px",background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:4,cursor:"pointer",fontSize:10}}>취소</button>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div style={{fontSize:16,fontWeight:500,color:"#2E6DA4"}}>{u.annualLeave||0}일</div>
                                  {canEdit && <button onClick={()=>setEditLeave(p=>({...p,[kA]:u.annualLeave||0}))} style={{marginTop:2,padding:"2px 6px",background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:4,cursor:"pointer",fontSize:10,color:"var(--color-text-secondary)"}}>수정</button>}
                                </div>
                              )}
                            </div>
                            <div style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"8px",textAlign:"center"}}>
                              <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:4}}>사용연차</div>
                              {canEdit && editLeave[kU]!==undefined ? (
                                <div style={{display:"flex",flexDirection:"column",gap:3}}>
                                  <input type="number" value={editLeave[kU]} onChange={e=>setEditLeave(p=>({...p,[kU]:e.target.value}))} style={{width:"100%",padding:"3px",textAlign:"center",boxSizing:"border-box"}} min={0} />
                                  <div style={{display:"flex",gap:3}}>
                                    <button onClick={async()=>{const val=parseInt(editLeave[kU]);if(isNaN(val)||val<0)return;await updateDoc(doc(db,"users",emailToKey(email)),{usedLeave:val});setEditLeave(p=>{const n={...p};delete n[kU];return n;});showNotif("저장!");}} style={{flex:1,padding:"3px",background:"#ba7517",color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontSize:10}}>저장</button>
                                    <button onClick={()=>setEditLeave(p=>{const n={...p};delete n[kU];return n;})} style={{flex:1,padding:"3px",background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:4,cursor:"pointer",fontSize:10}}>취소</button>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <button onClick={()=>setTab("inbox")} style={{background:"none",border:"none",cursor:"pointer",color:"#ba7517",fontWeight:500,fontSize:16,padding:0,display:"block",width:"100%"}}>{u.usedLeave||0}일</button>
                                  {canEdit && <button onClick={()=>setEditLeave(p=>({...p,[kU]:u.usedLeave||0}))} style={{marginTop:2,padding:"2px 6px",background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:4,cursor:"pointer",fontSize:10,color:"var(--color-text-secondary)"}}>수정</button>}
                                </div>
                              )}
                            </div>
                            <div style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"8px",textAlign:"center"}}>
                              <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:4}}>잔여연차</div>
                              <div style={{fontSize:16,fontWeight:500,color:rem2<3?"#e24b4a":"#1B5E45"}}>{rem2}일</div>
                            </div>
                          </div>
                        </div>
                      );
                    };
                    return (<>
                      {searchResult.length>0 && (<>
                        {searchResult.map(renderCard)}
                        <div style={{padding:"4px 8px",fontSize:11,color:"var(--color-text-secondary)"}}>── 전체 직원 ──</div>
                      </>)}
                      {otherUsers.map(renderCard)}
                    </>);
                  })()}
                </div>
                                {/* 팀장 이메일 관리 — 인사담당자만 */}
                {isHRUser && (
                <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"1.25rem",marginBottom:16}}>
                  <h3 style={{fontSize:15,fontWeight:500,marginBottom:12}}>팀장 이메일 관리</h3>
                  {Object.entries(managerConfig).map(([dept,email])=>(
                    <div key={dept} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                      <span style={{fontSize:13,minWidth:110,color:"var(--color-text-secondary)"}}>{dept}장</span>
                      <input value={email} onChange={e=>setManagerConfig(p=>({...p,[dept]:e.target.value}))} style={{flex:1,fontSize:12,boxSizing:"border-box"}} />
                    </div>
                  ))}
                  <button onClick={handleSaveManagerConfig} style={{marginTop:8,padding:"7px 16px",background:"#1B5E45",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:13,fontWeight:500}}>저장</button>
                </div>
                )}
                {/* 관리자 비밀번호 초기화 — 인사담당자만 */}
                {isHRUser && (
                <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"1.25rem"}}>
                  <h3 style={{fontSize:15,fontWeight:500,marginBottom:4}}>직원 비밀번호 초기화</h3>
                  <p style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:12}}>임시 비밀번호 이메일 발송이 안 될 경우 직접 변경해주세요.</p>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                    <select value={adminPwReset.email} onChange={e=>setAdminPwReset(p=>({...p,email:e.target.value}))} style={{flex:2,boxSizing:"border-box",fontSize:13}}>
                      <option value="">직원 선택</option>
                      {Object.entries(users).map(([email,u])=>(
                        <option key={email} value={email}>{u.name} ({email})</option>
                      ))}
                    </select>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                    <input type="text" value={adminPwReset.newPw} onChange={e=>setAdminPwReset(p=>({...p,newPw:e.target.value}))} placeholder="새 비밀번호" style={{flex:1,boxSizing:"border-box",fontSize:13}} />
                    <input type="text" value={adminPwReset.confirm} onChange={e=>setAdminPwReset(p=>({...p,confirm:e.target.value}))} placeholder="비밀번호 확인" style={{flex:1,boxSizing:"border-box",fontSize:13}} />
                    <button onClick={async()=>{
                      if(!adminPwReset.email){showNotif("직원을 선택해주세요.");return;}
                      if(!adminPwReset.newPw){showNotif("새 비밀번호를 입력해주세요.");return;}
                      if(adminPwReset.newPw!==adminPwReset.confirm){showNotif("비밀번호가 일치하지 않습니다.");return;}
                      await updateDoc(doc(db,"users",emailToKey(adminPwReset.email)),{password:adminPwReset.newPw});
                      setAdminPwReset({email:"",newPw:"",confirm:""});
                      showNotif("비밀번호가 변경되었습니다!");
                    }} style={{padding:"7px 14px",background:"#2E6DA4",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:13,fontWeight:500,flexShrink:0}}>변경</button>
                  </div>
                </div>
                )}
              </div>
            ) : (
              <div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
                  {[["부여 연차",annualLeave,"#2E6DA4"],["사용 연차",usedLeave,"#ba7517"],["잔여 연차",remainingLeave,"#1B5E45"]].map(([l,v,c])=>(
                    <div key={l} style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"1.5rem",textAlign:"center"}}>
                      <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:6}}>{l}</div>
                      <div style={{fontSize:28,fontWeight:500,color:c}}>{v}일</div>
                    </div>
                  ))}
                </div>
                <button onClick={()=>setTab("inbox")} style={{fontSize:13,color:"#2E6DA4",background:"none",border:"0.5px solid #378add",borderRadius:6,padding:"6px 14px",cursor:"pointer"}}>사용 연차 내역 보기 →</button>
              </div>
            )}
          </div>
          );
        })()}

        {/* ── 내 정보 탭 ── */}
        {tab==="myinfo" && (
          <div>
            <h2 style={{fontSize:16,fontWeight:600,marginBottom:16,color:"#2C2C2C",letterSpacing:"0.3px",paddingBottom:10,borderBottom:"2px solid #1B5E45"}}>내 정보</h2>
            <div style={{background:"#ffffff",border:"1px solid #e8e5e0",borderRadius:4,padding:"1.5rem",maxWidth:480,boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20,paddingBottom:16,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                <div style={{width:50,height:50,borderRadius:"50%",background:"#EAF3EE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:500,color:"#1B5E45"}}>{cu?.name?.[0]}</div>
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
              <button onClick={handleSaveMyInfo} style={{width:"100%",padding:"11px",background:"#1B5E45",color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontWeight:500,fontSize:14,marginTop:12,letterSpacing:"0.5px"}}>저장하기</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
