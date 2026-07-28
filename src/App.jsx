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
    if(status==="approved") return {label:"승인완료",  color:"#1d9e75"};
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
      <div style={{background:"#ffffff",borderRadius:4,border:"1px solid #e2dfd8",padding:"2.5rem 2rem",width:"100%",maxWidth:400,boxShadow:"0 4px 24px rgba(0,0,0,0.06)"}}>
        <div style={{textAlign:"center",marginBottom:"2rem"}}>
          <div style={{fontSize:28,marginBottom:8}}>🏢</div>
          <h1 style={{fontSize:17,fontWeight:600,margin:0,color:"#2C2C2C",letterSpacing:"0.3px"}}>씨스퀘어자산운용(주)</h1>
          <p style={{fontSize:13,color:"#1d9e75",margin:"4px 0 0",fontWeight:500}}>휴가관리 시스템</p>
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
          <button onClick={handleLogin} style={{width:"100%",padding:"11px",background:"#1d9e75",color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontWeight:500,fontSize:14,marginBottom:12,letterSpacing:"0.5px"}}>로그인</button>
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
          {msg&&<p style={{fontSize:12,color:msg.includes("완료")?"#1d9e75":"#e24b4a",marginBottom:8}}>{msg}</p>}
          <button onClick={handleRegister} style={{width:"100%",padding:"10px",background:"#1d9e75",color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontWeight:500,fontSize:14,marginBottom:8,letterSpacing:"0.5px"}}>가입하기</button>
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
      <div style={{background:"#1d9e75",padding:"0 1.25rem",display:"flex",alignItems:"center",justifyContent:"space-between",height:56,position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 12px rgba(0,0,0,0.1)"}}>
        <div>
          <div style={{fontSize:14,fontWeight:600,color:"#ffffff",letterSpacing:"0.3px"}}>씨스퀘어자산운용(주)</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.75)",letterSpacing:"1px"}}>휴가관리 시스템</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:12,fontWeight:500,color:"#ffffff"}}>{cu?.name}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.7)"}}>{cu?.dept}</div>
          </div>
          <button onClick={()=>{setCurrentUser(null);setPage("login");setLoginForm({email:"",password:""});}} style={{fontSize:11,padding:"5px 12px",background:"rgba(255,255,255,0.2)",border:"1px solid rgba(255,255,255,0.35)",borderRadius:4,cursor:"pointer",color:"#fff",letterSpacing:"0.5px"}}>로그아웃</button>
        </div>
      </div>
      {/* 탭 */}
      <div style={{background:"#ffffff",borderBottom:"1px solid #e2dfd8",display:"flex"}}>
        {[["apply","휴가신청"],["inbox","결재함"],["annual","연차관리"],["myinfo","내 정보"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{
            flex:1,padding:"14px 4px",background:"none",border:"none",cursor:"pointer",fontSize:12,
            fontWeight:tab===k?600:400,
            color:tab===k?"#1d9e75":"#999",
            borderBottom:tab===k?"2.5px solid #1d9e75":"2.5px solid transparent",
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
            <h2 style={{fontSize:16,fontWeight:600,marginBottom:16,color:"#2C2C2C",letterSpacing:"0.3px",paddingBottom:10,borderBottom:"2px solid #1d9e75"}}>휴가신청</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
              {[["부여 연차",annualLeave,"#2E6DA4"],["사용 연차",usedLeave,"#ba7517"],["잔여 연차",remainingLeave,"#1d9e75"]].map(([l,v,c])=>(
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
                        <input value="✓ 자동 통과" readOnly style={{flex:1,background:"#EAF3EE",boxSizing:"border-box",color:"#1d9e75",fontWeight:500}} />
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
              <button onClick={handleApply} style={{width:"100%",padding:"13px",background:"#1d9e75",color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontWeight:500,fontSize:14,letterSpacing:"0.5px"}}>휴가 신청하기</button>
            </div>
          </div>
        )}

        {/* ── 결재함 탭 ── */}
        {tab==="inbox" && (
          <div>
            <h2 style={{fontSize:16,fontWeight:600,marginBottom:16,color:"#2C2C2C",letterSpacing:"0.3px",paddingBottom:10,borderBottom:"2px solid #1d9e75"}}>결재함</h2>
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
                            <div style={{marginTop:6,padding:"6px 10px",background:"#EAF3EE",borderRadius:6,fontSize:12,color:"#1d9e75",fontWeight:500}}>
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
                      }} style={{padding:"3px 6px",background:"#1d9e75",color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontSize:11}}>저장</button>
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
                <td style={{padding:"10px 12px",color:rem<3?"#e24b4a":"#1d9e75",fontWeight:500}}>{rem}일</td>
              </tr>
            );
          };

          return (
          <div>
            <h2 style={{fontSize:16,fontWeight:600,marginBottom:16,color:"#2C2C2C",letterSpacing:"0.3px",paddingBottom:10,borderBottom:"2px solid #1d9e75"}}>연차관리</h2>
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
                                    <button onClick={async()=>{const val=parseInt(editLeave[kA]);if(isNaN(val)||val<0)return;await updateDoc(doc(db,"users",emailToKey(email)),{annualLeave:val});setEditLeave(p=>{const n={...p};delete n[kA];return n;});showNotif("저장!");}} style={{flex:1,padding:"3px",background:"#1d9e75",color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontSize:10}}>저장</button>
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
                              <div style={{fontSize:16,fontWeight:500,color:rem2<3?"#e24b4a":"#1d9e75"}}>{rem2}일</div>
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
                  <button onClick={handleSaveManagerConfig} style={{marginTop:8,padding:"7px 16px",background:"#1d9e75",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:13,fontWeight:500}}>저장</button>
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
                  {[["부여 연차",annualLeave,"#2E6DA4"],["사용 연차",usedLeave,"#ba7517"],["잔여 연차",remainingLeave,"#1d9e75"]].map(([l,v,c])=>(
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
            <h2 style={{fontSize:16,fontWeight:600,marginBottom:16,color:"#2C2C2C",letterSpacing:"0.3px",paddingBottom:10,borderBottom:"2px solid #1d9e75"}}>내 정보</h2>
            <div style={{background:"#ffffff",border:"1px solid #e8e5e0",borderRadius:4,padding:"1.5rem",maxWidth:480,boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20,paddingBottom:16,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                <div style={{width:50,height:50,borderRadius:"50%",background:"#EAF3EE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:500,color:"#1d9e75"}}>{cu?.name?.[0]}</div>
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
              <button onClick={handleSaveMyInfo} style={{width:"100%",padding:"11px",background:"#1d9e75",color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontWeight:500,fontSize:14,marginTop:12,letterSpacing:"0.5px"}}>저장하기</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
