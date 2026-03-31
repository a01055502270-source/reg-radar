"use client";
import { useState, useCallback, useEffect } from "react";

var T={bg:"#F5F6F8",surface:"#FFFFFF",surfaceAlt:"#FAFBFC",navy:"#162240",navyLight:"#1E3054",navyMuted:"#2D4470",primary:"#1A56DB",primaryLight:"#E8F0FE",text:"#1C1F26",textSec:"#5F6B7A",textTer:"#98A2B3",border:"#E2E5EB",borderL:"#EEF0F4",red:"#C93B3B",redBg:"#FEF2F2",redBd:"#FECACA",amber:"#B45309",amberBg:"#FFFBEB",amberBd:"#FDE68A",blue:"#1D4ED8",blueBg:"#EFF6FF",blueBd:"#BFDBFE",R:6};
var FN="'Noto Sans KR','IBM Plex Sans',-apple-system,sans-serif";
var MO="'IBM Plex Mono','SF Mono',monospace";

var SRC_MAP={fss:{name:"금감원",color:T.primary},fsc:{name:"금융위",color:"#6D28D9"},bok:{name:"한은",color:"#0E7490"},na:{name:"국회",color:"#92400E"}};
var SEV_MAP={critical:{label:"긴급",color:T.red,bg:T.redBg,bd:T.redBd},high:{label:"중요",color:T.amber,bg:T.amberBg,bd:T.amberBd},medium:{label:"참고",color:T.primary,bg:T.primaryLight,bd:T.blueBd},low:{label:"일반",color:T.textTer,bg:T.surfaceAlt,bd:T.borderL}};
var DEPTS=["리스크관리부","여신심사부","준법감시부","경영관리부","자금운용부","IT기획부","감사부","신탁부","외환부","소비자보호부"];

function Badge(props){var x=SEV_MAP[props.s]||SEV_MAP.medium;return <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 7px",borderRadius:3,fontSize:11,fontWeight:600,color:x.color,background:x.bg,border:"1px solid "+x.bd}}>{"● "+x.label}</span>;}
function SrcB(props){var s=SRC_MAP[props.id]||{name:"?",color:"#999"};return <span style={{padding:"1px 6px",borderRadius:3,fontSize:10,fontWeight:600,color:s.color,background:s.color+"0C",border:"1px solid "+s.color+"20"}}>{s.name}</span>;}
function Btn(props){return <button onClick={props.onClick} disabled={props.disabled} style={{display:"inline-flex",alignItems:"center",gap:6,padding:props.small?"5px 10px":"8px 16px",borderRadius:T.R,border:"1px solid",fontSize:props.small?12:13,fontWeight:500,fontFamily:FN,cursor:props.disabled?"default":"pointer",opacity:props.disabled?0.5:1,...(props.primary?{background:T.primary,borderColor:"#1648B8",color:"#fff"}:{background:T.surface,borderColor:T.border,color:T.text}),...(props.style||{})}}>{props.children}</button>;}

function Timer(){
  var ref=useState(0);var s=ref[0];var setS=ref[1];
  useEffect(function(){var t=setInterval(function(){setS(function(v){return v+1;});},1000);return function(){clearInterval(t);};},[]);
  return <div style={{textAlign:"center",padding:"28px 0"}}><div style={{display:"inline-block",width:22,height:22,border:"2.5px solid "+T.borderL,borderTopColor:T.primary,borderRadius:"50%",animation:"spin .8s linear infinite"}}/><p style={{fontSize:13,fontWeight:600,marginTop:10}}>처리 중</p><p style={{fontSize:22,color:T.primary,fontFamily:MO,marginTop:6}}>{s}초</p></div>;
}

export default function Page(){
  var pgS=useState("dashboard");var pg=pgS[0];var setPg=pgS[1];
  var selS=useState(null);var sel=selS[0];var setSel=selS[1];
  var regsS=useState([]);var regs=regsS[0];var setRegs=regsS[1];
  var anaS=useState({});var ana=anaS[0];var setAna=anaS[1];
  var anaingS=useState(null);var anaing=anaingS[0];var setAnaing=anaingS[1];
  var anaErrS=useState({});var anaErr=anaErrS[0];var setAnaErr=anaErrS[1];
  var deptS=useState("리스크관리부");var dept=deptS[0];var setDept=deptS[1];
  var sideS=useState(false);var side=sideS[0];var setSide=sideS[1];
  var rptGenS=useState(false);var rptGen=rptGenS[0];var setRptGen=rptGenS[1];
  var rptS=useState(null);var rpt=rptS[0];var setRpt=rptS[1];
  var rptPS=useState("2026년 3월");var rptP=rptPS[0];var setRptP=rptPS[1];
  var mobS=useState(false);var mob=mobS[0];var setMob=mobS[1];
  var loadS=useState(true);var loading=loadS[0];var setLoading=loadS[1];
  // Feed filters
  var sevFS=useState("all");var sevF=sevFS[0];var setSevF=sevFS[1];
  var srcFS=useState("all");var srcF=srcFS[0];var setSrcF=srcFS[1];

  useEffect(function(){
    var c=function(){setMob(window.innerWidth<768);};c();
    window.addEventListener("resize",c);
    return function(){window.removeEventListener("resize",c);};
  },[]);

  useEffect(function(){
    fetch("/api/regulations?limit=100")
      .then(function(r){return r.json();})
      .then(function(data){
        if(Array.isArray(data)){setRegs(data);}
        setLoading(false);
      })
      .catch(function(){setLoading(false);});
  },[]);

  var today=new Date().toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric",weekday:"long"});
  var crit=regs.filter(function(r){return r.severity==="critical";}).length;
  var myRegs=regs.filter(function(r){return r.departments&&r.departments.indexOf(dept)>=0;});

  // Filtered feed
  var filt=regs.filter(function(r){
    if(sevF!=="all"&&r.severity!==sevF)return false;
    if(srcF!=="all"&&r.source!==srcF)return false;
    return true;
  });

  // Navigate to feed with filter
  function goFeed(severity,source){
    setSevF(severity||"all");
    setSrcF(source||"all");
    setPg("feed");
    setSel(null);
    setSide(false);
  }

  function go(p){setPg(p);setSel(null);setSide(false);setSevF("all");setSrcF("all");}
  var det=sel?regs.find(function(r){return r.id===sel;}):null;
  var ai=det?ana[det.id]:null;
  var isA=det?(anaing===det.id):false;
  var er=det?anaErr[det.id]:null;

  function doAnalyze(reg){
    setAnaing(reg.id);
    setAnaErr(function(p){var n={};for(var k in p)n[k]=p[k];n[reg.id]=null;return n;});
    fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({regulationId:reg.id})})
      .then(function(r){return r.json();})
      .then(function(data){
        if(data.error){throw new Error(data.message||data.error);}
        setAna(function(p){var n={};for(var k in p)n[k]=p[k];n[reg.id]=data;return n;});
        setAnaing(null);
      })
      .catch(function(e){
        setAnaErr(function(p){var n={};for(var k in p)n[k]=p[k];n[reg.id]=e.message||String(e);return n;});
        setAnaing(null);
      });
  }

  function doReport(){
    setRptGen(true);setRpt(null);
    fetch("/api/report",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({department:dept,period:rptP})})
      .then(function(r){return r.json();})
      .then(function(data){
        if(data.error){setRpt("오류: "+(data.message||data.error));}
        else{setRpt(data.content||"내용 없음");}
        setRptGen(false);
      })
      .catch(function(e){setRpt("오류: "+e.message);setRptGen(false);});
  }

  return(
    <div style={{display:"flex",minHeight:"100vh",background:T.bg,fontFamily:FN,color:T.text,fontSize:13}}>
      {mob&&side&&<div onClick={function(){setSide(false);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:90}}/>}

      {/* Sidebar */}
      <aside style={{width:mob?260:220,background:T.navy,display:"flex",flexDirection:"column",flexShrink:0,...(mob?{position:"fixed",left:side?0:-270,top:0,bottom:0,zIndex:100,transition:"left .25s",boxShadow:side?"4px 0 20px rgba(0,0,0,.3)":"none"}:{})}}>
        <div style={{padding:"20px 18px 16px",borderBottom:"1px solid "+T.navyLight}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:6,background:"linear-gradient(135deg,#3B82F6,#1D4ED8)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:14,fontWeight:700,fontFamily:MO}}>RR</div>
            <div><div style={{color:"#E8ECF4",fontSize:14,fontWeight:700}}>규제레이더</div><div style={{color:"#6B7FA3",fontSize:10,fontFamily:MO}}>v3.2</div></div>
          </div>
        </div>
        <nav style={{padding:"12px 10px",flex:1}}>
          {[["dashboard","대시보드"],["feed","규제 피드"],["reports","보고서"],["settings","설정"]].map(function(arr){
            return <button key={arr[0]} onClick={function(){go(arr[0]);}} style={{display:"flex",alignItems:"center",width:"100%",padding:"10px 12px",marginBottom:2,borderRadius:5,border:"none",cursor:"pointer",fontSize:13,fontWeight:500,fontFamily:FN,textAlign:"left",background:pg===arr[0]?"rgba(255,255,255,.08)":"transparent",color:pg===arr[0]?"#E8ECF4":"#8899B4"}}>{arr[1]}</button>;
          })}
        </nav>
        <div style={{padding:"14px",borderTop:"1px solid "+T.navyLight}}>
          <div style={{fontSize:10,color:"#6B7FA3",marginBottom:6}}>소속 부서</div>
          <select value={dept} onChange={function(e){setDept(e.target.value);}} style={{width:"100%",padding:"6px 8px",borderRadius:4,background:T.navyLight,border:"1px solid "+T.navyMuted,color:"#C8D4E6",fontSize:12,fontFamily:FN}}>{DEPTS.map(function(d){return <option key={d}>{d}</option>;})}</select>
        </div>
      </aside>

      {/* Main */}
      <main style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
        <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:mob?"10px 16px":"12px 24px",background:T.surface,borderBottom:"1px solid "+T.border,flexShrink:0,gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {mob&&<button onClick={function(){setSide(true);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:T.textSec}}>{"☰"}</button>}
            <div>
              <h1 style={{margin:0,fontSize:mob?14:16,fontWeight:700}}>{pg==="dashboard"?"대시보드":pg==="feed"?"규제 피드":pg==="reports"?"보고서":"설정"}</h1>
              {!mob&&<div style={{fontSize:11,color:T.textTer,marginTop:2}}>{today}</div>}
            </div>
          </div>
          <Btn small style={{position:"relative"}}>알림{crit>0&&<span style={{position:"absolute",top:0,right:0,width:14,height:14,borderRadius:"50%",background:T.red,color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{crit}</span>}</Btn>
        </header>

        <div style={{flex:1,overflow:"auto",padding:mob?"16px":"20px 24px"}}>

          {loading&&<div style={{textAlign:"center",padding:"60px 0",color:T.textTer}}>데이터 로딩 중...</div>}

          {/* ═══ DASHBOARD ═══ */}
          {!loading&&pg==="dashboard"&&!sel&&<div>
            {/* Stats — clickable */}
            <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:mob?8:14,marginBottom:mob?14:20}}>
              {[
                {l:"전체",v:regs.length,s:"수집된 규제",c:null,click:function(){goFeed();}},
                {l:"긴급",v:crit,s:"즉시 검토",c:T.red,click:function(){goFeed("critical");}},
                {l:"내 부서",v:myRegs.length,s:dept,c:T.primary,click:null},
                {l:"금감원",v:regs.filter(function(r){return r.source==="fss";}).length,s:"FSS",c:null,click:function(){goFeed(null,"fss");}},
              ].map(function(item,i){
                return <div key={i} onClick={item.click} style={{background:T.surface,border:"1px solid "+T.border,borderRadius:T.R,padding:mob?"12px":"16px 18px",cursor:item.click?"pointer":"default",transition:"box-shadow .15s"}} onMouseEnter={function(e){if(item.click)e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,.08)";}} onMouseLeave={function(e){e.currentTarget.style.boxShadow="none";}}>
                  <div style={{fontSize:11,color:T.textTer,marginBottom:4}}>{item.l}</div>
                  <div style={{fontSize:mob?22:26,fontWeight:700,color:item.c||T.text}}>{item.v}</div>
                  <div style={{fontSize:10,color:item.click?T.primary:T.textTer,marginTop:2}}>{item.click?"클릭하여 보기 →":item.s}</div>
                </div>;
              })}
            </div>

            {crit>0&&<div style={{background:T.redBg,border:"1px solid "+T.redBd,borderRadius:T.R,padding:"10px 14px",marginBottom:14,fontSize:12,color:T.red,cursor:"pointer"}} onClick={function(){goFeed("critical");}}><b>긴급</b> — {crit}건 즉시 검토 필요 <span style={{float:"right",fontWeight:600}}>보기 →</span></div>}

            {/* Source breakdown */}
            <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:8,marginBottom:20}}>
              {[{id:"fss",n:"금감원"},{id:"fsc",n:"금융위"},{id:"bok",n:"한은"},{id:"na",n:"국회"}].map(function(s){
                var cnt=regs.filter(function(r){return r.source===s.id;}).length;
                var src=SRC_MAP[s.id];
                return <div key={s.id} onClick={function(){goFeed(null,s.id);}} style={{background:T.surface,border:"1px solid "+T.border,borderRadius:T.R,padding:"10px 14px",cursor:"pointer",borderLeft:"3px solid "+src.color}}>
                  <div style={{fontSize:11,color:T.textTer}}>{s.n}</div>
                  <div style={{fontSize:20,fontWeight:700,color:T.text}}>{cnt}<span style={{fontSize:11,color:T.textTer,fontWeight:400}}> 건</span></div>
                </div>;
              })}
            </div>

            {/* My dept list */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{fontSize:14,fontWeight:700}}>{dept} 관련</div>
              <button onClick={function(){goFeed();}} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:T.primary,fontFamily:FN}}>전체 보기 →</button>
            </div>
            <div style={{background:T.surface,border:"1px solid "+T.border,borderRadius:T.R,overflow:"hidden"}}>
              {myRegs.length===0&&<div style={{padding:32,textAlign:"center",color:T.textTer}}>관련 규제 없음</div>}
              {myRegs.slice(0,10).map(function(r,i){
                return <div key={r.id} onClick={function(){setSel(r.id);}} style={{padding:mob?"12px 14px":"14px 18px",cursor:"pointer",borderBottom:i<Math.min(myRegs.length,10)-1?"1px solid "+T.borderL:"none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap"}}><Badge s={r.severity}/><SrcB id={r.source}/><span style={{fontSize:11,color:T.textTer,fontFamily:MO}}>{(r.publishedAt||"").slice(0,10)}</span></div>
                  <div style={{fontSize:13,fontWeight:600,lineHeight:1.4}}>{r.title}</div>
                </div>;
              })}
            </div>
          </div>}

          {/* ═══ FEED ═══ */}
          {!loading&&pg==="feed"&&!sel&&<div>
            {/* Filter bar */}
            <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
              <select value={sevF} onChange={function(e){setSevF(e.target.value);}} style={{padding:"7px 10px",borderRadius:T.R,border:"1px solid "+T.border,fontSize:12,fontFamily:FN}}>
                <option value="all">전체 등급</option>
                <option value="critical">긴급</option>
                <option value="high">중요</option>
                <option value="medium">참고</option>
                <option value="low">일반</option>
              </select>
              <select value={srcF} onChange={function(e){setSrcF(e.target.value);}} style={{padding:"7px 10px",borderRadius:T.R,border:"1px solid "+T.border,fontSize:12,fontFamily:FN}}>
                <option value="all">전체 출처</option>
                <option value="fss">금감원</option>
                <option value="fsc">금융위</option>
                <option value="bok">한은</option>
                <option value="na">국회</option>
              </select>
              <span style={{fontSize:12,color:T.textTer}}>{filt.length}건</span>
              {(sevF!=="all"||srcF!=="all")&&<button onClick={function(){setSevF("all");setSrcF("all");}} style={{background:"none",border:"1px solid "+T.border,borderRadius:T.R,padding:"5px 10px",fontSize:11,color:T.textSec,cursor:"pointer",fontFamily:FN}}>필터 초기화</button>}
            </div>

            <div style={{background:T.surface,border:"1px solid "+T.border,borderRadius:T.R,overflow:"hidden"}}>
              {filt.map(function(r,i){
                return <div key={r.id} onClick={function(){setSel(r.id);}} style={{padding:mob?"12px 14px":"14px 18px",cursor:"pointer",borderBottom:i<filt.length-1?"1px solid "+T.borderL:"none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap"}}><Badge s={r.severity}/><SrcB id={r.source}/><span style={{fontSize:10,color:T.textTer,fontFamily:MO}}>{(r.publishedAt||"").slice(0,10)}</span></div>
                  <div style={{fontSize:13,fontWeight:500,lineHeight:1.4}}>{r.title}</div>
                  {/* Preview context */}
                  {r.context&&<div style={{fontSize:12,color:T.textTer,marginTop:4,lineHeight:1.4,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{r.context}</div>}
                </div>;
              })}
              {filt.length===0&&<div style={{padding:32,textAlign:"center",color:T.textTer}}>해당 조건의 규제가 없습니다.</div>}
            </div>
          </div>}

          {/* ═══ DETAIL ═══ */}
          {!loading&&sel&&det&&<div>
            <button onClick={function(){setSel(null);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:T.textSec,fontFamily:FN,padding:0,marginBottom:14}}>← 목록</button>
            <div style={{background:T.surface,border:"1px solid "+T.border,borderRadius:T.R,overflow:"hidden"}}>
              {/* Header */}
              <div style={{padding:mob?"16px":"20px 24px",borderBottom:"1px solid "+T.borderL}}>
                <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}><Badge s={det.severity}/><SrcB id={det.source}/><span style={{fontSize:11,color:T.textTer,fontFamily:MO}}>{(det.publishedAt||"").slice(0,10)}</span></div>
                <h2 style={{margin:"0 0 8px",fontSize:mob?15:18,fontWeight:700,lineHeight:1.4}}>{det.title}</h2>
                <div style={{display:"flex",gap:12,fontSize:12,color:T.textSec,flexWrap:"wrap"}}>
                  {det.category&&<span>분류: <b>{det.category}</b></span>}
                  {det.status&&<span>상태: <b>{det.status}</b></span>}
                </div>
                {det.departments&&det.departments.length>0&&<div style={{marginTop:8,display:"flex",gap:4,flexWrap:"wrap"}}>{det.departments.map(function(d){return <span key={d} style={{padding:"2px 8px",borderRadius:3,fontSize:11,background:T.surfaceAlt,border:"1px solid "+T.borderL,color:T.textSec}}>{d}</span>;})}</div>}
                {/* Source URL */}
                {det.sourceUrl&&<a href={det.sourceUrl} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:5,marginTop:12,padding:"6px 14px",borderRadius:T.R,background:T.primaryLight,border:"1px solid "+T.blueBd,color:T.primary,fontSize:12,fontWeight:600,fontFamily:FN,textDecoration:"none"}}>원문 보기 ↗</a>}
              </div>

              {/* Article Content */}
              {det.context&&<div style={{padding:mob?"16px":"20px 24px",borderBottom:"1px solid "+T.borderL}}>
                <div style={{fontSize:11,fontWeight:700,color:T.textTer,marginBottom:8,letterSpacing:"0.05em"}}>규제 내용</div>
                <div style={{fontSize:13,color:T.text,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{det.context}</div>
              </div>}

              {/* Analysis */}
              <div style={{padding:mob?"16px":"20px 24px"}}>
                <div style={{fontSize:11,fontWeight:700,color:T.textTer,marginBottom:12,letterSpacing:"0.05em"}}>AI 분석</div>

                {!ai&&!isA&&!er&&<div style={{textAlign:"center",padding:"16px 0"}}><p style={{fontSize:13,color:T.textSec,marginBottom:12}}>AI 분석을 실행하여 영향도와 대응방안을 확인합니다.</p><Btn primary onClick={function(){doAnalyze(det);}}>분석 실행</Btn><p style={{fontSize:11,color:T.textTer,marginTop:8}}>Claude API 연동 필요 (카드 등록 후 작동)</p></div>}

                {!ai&&!isA&&er&&<div><div style={{background:T.redBg,border:"1px solid "+T.redBd,borderRadius:T.R,padding:"14px 16px",marginBottom:12}}><div style={{fontSize:12,fontWeight:700,color:T.red,marginBottom:4}}>분석 실패</div><div style={{fontSize:12,color:T.red,lineHeight:1.6,wordBreak:"break-all"}}>{er}</div></div><div style={{textAlign:"center"}}><Btn primary onClick={function(){doAnalyze(det);}}>재시도</Btn></div></div>}

                {isA&&<Timer/>}

                {ai&&<div>
                  {ai.summary&&<div style={{marginBottom:16}}><div style={{fontSize:11,fontWeight:600,color:T.textTer,marginBottom:6}}>요약</div><p style={{fontSize:13,color:T.text,lineHeight:1.7,margin:0,padding:"12px 14px",background:T.surfaceAlt,borderRadius:T.R,borderLeft:"3px solid "+T.primary}}>{ai.summary}</p></div>}
                  {ai.impact&&<div style={{marginBottom:16}}><div style={{fontSize:11,fontWeight:600,color:T.textTer,marginBottom:6}}>실무 영향</div><p style={{fontSize:13,color:T.textSec,lineHeight:1.7,margin:0}}>{ai.impact}</p></div>}
                  {ai.changes&&ai.changes.length>0&&<div style={{marginBottom:16}}><div style={{fontSize:11,fontWeight:600,color:T.textTer,marginBottom:6}}>변경사항</div><div style={{border:"1px solid "+T.border,borderRadius:T.R,overflow:"hidden"}}>{ai.changes.map(function(c,i){return <div key={i} style={{display:"flex",padding:"10px 14px",borderBottom:i<ai.changes.length-1?"1px solid "+T.borderL:"none",fontSize:13,color:T.textSec,lineHeight:1.5,gap:10}}><span style={{color:T.primary,fontWeight:700,fontFamily:MO,fontSize:11,minWidth:20}}>{i+1}</span><span>{c}</span></div>;})}</div></div>}
                  {ai.actions&&ai.actions.length>0&&<div style={{marginBottom:16}}><div style={{fontSize:11,fontWeight:600,color:T.red,marginBottom:6}}>조치 필요</div><div style={{background:T.redBg,border:"1px solid "+T.redBd,borderRadius:T.R,overflow:"hidden"}}>{ai.actions.map(function(c,i){return <div key={i} style={{display:"flex",padding:"10px 14px",borderBottom:i<ai.actions.length-1?"1px solid "+T.redBd:"none",fontSize:13,color:T.red,lineHeight:1.5,gap:10}}><span style={{fontWeight:700,fontFamily:MO,fontSize:11,minWidth:20}}>{i+1}</span><span>{c}</span></div>;})}</div></div>}
                  <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:10}}>
                    {ai.deadline_text&&<div style={{padding:"10px 12px",background:T.amberBg,border:"1px solid "+T.amberBd,borderRadius:T.R}}><div style={{fontSize:10,fontWeight:700,color:T.amber,marginBottom:3}}>기한</div><div style={{fontSize:12,color:T.amber}}>{ai.deadline_text}</div></div>}
                    {ai.related_regulations&&<div style={{padding:"10px 12px",background:T.blueBg,border:"1px solid "+T.blueBd,borderRadius:T.R}}><div style={{fontSize:10,fontWeight:700,color:T.blue,marginBottom:3}}>관련 규정</div><div style={{fontSize:12,color:T.blue}}>{ai.related_regulations}</div></div>}
                    {ai.risk&&<div style={{padding:"10px 12px",background:T.redBg,border:"1px solid "+T.redBd,borderRadius:T.R}}><div style={{fontSize:10,fontWeight:700,color:T.red,marginBottom:3}}>미이행 리스크</div><div style={{fontSize:12,color:T.red}}>{ai.risk}</div></div>}
                  </div>
                </div>}
              </div>
            </div>
          </div>}

          {/* ═══ REPORTS ═══ */}
          {pg==="reports"&&<div>
            <div style={{background:T.surface,border:"1px solid "+T.border,borderRadius:T.R,padding:mob?16:24,marginBottom:20}}>
              <h3 style={{margin:"0 0 6px",fontSize:14,fontWeight:700}}>월간 규제동향 보고</h3>
              <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12,marginBottom:16,marginTop:14}}>
                <div><label style={{fontSize:12,fontWeight:600,display:"block",marginBottom:6}}>기간</label><select value={rptP} onChange={function(e){setRptP(e.target.value);}} style={{width:"100%",padding:"8px 10px",borderRadius:T.R,border:"1px solid "+T.border,fontSize:12,fontFamily:FN}}><option>2026년 3월</option><option>2026년 2월</option></select></div>
                <div><label style={{fontSize:12,fontWeight:600,display:"block",marginBottom:6}}>부서</label><div style={{padding:"8px 10px",borderRadius:T.R,border:"1px solid "+T.border,fontSize:12,background:T.surfaceAlt}}>{dept}</div></div>
              </div>
              <Btn primary onClick={doReport} disabled={rptGen}>{rptGen?"생성 중...":"보고서 생성"}</Btn>
            </div>
            {rptGen&&<Timer/>}
            {rpt&&!rptGen&&<div style={{background:T.surface,border:"1px solid "+T.border,borderRadius:T.R,overflow:"hidden"}}>
              <div style={{padding:"18px 24px",borderBottom:"2px solid "+T.text,background:T.surfaceAlt,textAlign:"center"}}>
                <div style={{fontSize:10,color:T.textTer,fontFamily:MO,marginBottom:4}}>내부보고</div>
                <div style={{fontSize:18,fontWeight:700}}>{rptP} {dept} 규제동향 보고</div>
                <div style={{fontSize:11,color:T.textTer,marginTop:6}}>보고일: {today}</div>
              </div>
              <div style={{padding:mob?16:24}}>
                <div style={{fontSize:13,color:T.text,lineHeight:1.9,whiteSpace:"pre-wrap"}}>{rpt}</div>
              </div>
              <div style={{padding:"12px 24px",borderTop:"1px solid "+T.borderL,background:T.surfaceAlt,fontSize:10,color:T.textTer,textAlign:"right"}}>— 끝 —</div>
            </div>}
          </div>}

          {/* ═══ SETTINGS ═══ */}
          {pg==="settings"&&<div style={{background:T.surface,border:"1px solid "+T.border,borderRadius:T.R,padding:mob?16:24}}>
            <h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:700}}>설정</h3>
            <p style={{fontSize:13,color:T.textSec,lineHeight:1.6}}>알림 및 사용자 설정은 추후 업데이트됩니다.</p>
          </div>}
        </div>
      </main>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box;margin:0}button:hover{opacity:.88}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:"+T.border+";border-radius:3px}"}</style>
    </div>
  );
}
