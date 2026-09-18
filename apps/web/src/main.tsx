import { type FormEvent, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const API = 'http://localhost:3001';

type Role = 'ADMIN' | 'TEACHER';
type Session = { token: string; user: { id: string; name: string; role: Role } };
type ClassSummary = { id: string; title: string; dayOfWeek: number; startMinute: number; endMinute: number };
type StudentSummary = { id: string; name: string; creditBalance: number };
type TeacherBrief = { fallback: boolean; summary: string; learningGoal: string; supportStrategies: string[]; firstLessonChecklist: string[] };
type TeacherStudent = StudentSummary & { learningGoal: string; notes: string; brief: TeacherBrief | null };
type TeacherClass = ClassSummary & { students: TeacherStudent[] };
type TeacherDashboard = { timezone: string; classes: TeacherClass[] };
type Risk = { studentId: string; studentName: string; type: string; message: string };
type AdminDashboard = { timezone: string; risks: Risk[]; students: StudentSummary[] };
type StudentDetail = StudentSummary & { enrollments: ClassSummary[]; availableClasses: ClassSummary[] };
type EnrollmentResult = { brief: TeacherBrief };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const request = async <T,>(path: string, token?: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options?.headers },
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const message = isRecord(body) && typeof body.message === 'string'
      ? body.message
      : isRecord(body) && typeof body.error === 'string'
        ? body.error
        : 'Request failed';
    throw new Error(message);
  }
  return body as T;
};

const formatTime = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [adminData, setAdminData] = useState<AdminDashboard | null>(null);
  const [teacherData, setTeacherData] = useState<TeacherDashboard | null>(null);
  const [selected, setSelected] = useState<StudentDetail | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const load = async (current: Session) => {
    setLoading(true);
    try {
      if (current.user.role === 'ADMIN') {
        setAdminData(await request<AdminDashboard>('/admin/dashboard-risk', current.token));
        setTeacherData(null);
      } else {
        setTeacherData(await request<TeacherDashboard>('/teachers/me/today', current.token));
        setAdminData(null);
      }
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    try {
      const next = await request<Session>('/auth/login', undefined, { method: 'POST', body: JSON.stringify({ email, password }) });
      setSession(next);
      setMessage('');
      void load(next);
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const inspect = async (id: string) => {
    if (!session) return;
    try {
      setSelected(await request<StudentDetail>(`/students/${id}`, session.token));
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const enroll = async (classId: string) => {
    if (!session || !selected) return;
    try {
      const result = await request<EnrollmentResult>(`/students/${selected.id}/enrollments`, session.token, { method: 'POST', body: JSON.stringify({ classId }) });
      setMessage(`排班成功。${result.brief.fallback ? '已使用可靠的规则交接卡。' : '已生成教师交接卡。'}`);
      await inspect(selected.id);
      await load(session);
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const logout = () => {
    setSession(null);
    setAdminData(null);
    setTeacherData(null);
    setSelected(null);
    setMessage('');
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demo123');
  };

  if (!session) {
    return <main className="login">
      <p className="eyebrow">AUSTIN EDUCATION / MELBOURNE</p>
      <h1>把每一次<br /><i>开始上课</i>安排好。</h1>
      <p>登录后只能查看自己负责的学生和课程。</p>
      <form className="loginform" onSubmit={(event: FormEvent) => { event.preventDefault(); void login(); }}>
        <label>账号<input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="name@austin.edu" required /></label>
        <label>密码<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" placeholder="输入密码" required /></label>
        <button type="submit">登录</button>
      </form>
      {message && <p className="error">{message}</p>}
      <section className="demoaccounts">
        <p className="eyebrow">DEMO ACCOUNTS / PASSWORD: demo123</p>
        <button type="button" onClick={() => fillDemo('ava@austin.edu')}>Ava · Admin</button>
        <button type="button" onClick={() => fillDemo('noah@austin.edu')}>Noah · Admin</button>
        <button type="button" onClick={() => fillDemo('priya@austin.edu')}>Priya · Admin</button>
        <button type="button" onClick={() => fillDemo('luca@austin.edu')}>Luca · Teacher</button>
        <button type="button" onClick={() => fillDemo('mia@austin.edu')}>Mia · Teacher</button>
        <button type="button" onClick={() => fillDemo('ben@austin.edu')}>Ben · Teacher</button>
      </section>
    </main>;
  }

  if (session.user.role === 'TEACHER') {
    return <main className="shell">
      <header><p className="eyebrow">TEACHER / MY CLASSES</p><h1>你好，{session.user.name}</h1><button className="text" onClick={logout}>退出</button></header>
      {loading ? <p>正在同步课程...</p> : teacherData?.classes.map((room) => <section className="lesson" key={room.id}>
        <span>每周 {room.dayOfWeek} · {formatTime(room.startMinute)}</span>
        <h2>{room.title}</h2>
        {room.students.length ? room.students.map((student) => <article key={student.id}>
          <b>{student.name}</b><p>{student.learningGoal}</p><small>{student.notes}</small>
          {student.brief && <details><summary>{student.brief.fallback ? '规则模板首课交接卡' : 'AI 生成的首课交接卡'}</summary><p>{student.brief.summary}</p><p><b>支持建议：</b>{student.brief.supportStrategies.join('；')}</p><p><b>首课检查：</b>{student.brief.firstLessonChecklist.join('；')}</p></details>}
        </article>) : <p>该班暂时没有学生。</p>}
      </section>)}
    </main>;
  }

  return <main className="shell">
    <header><p className="eyebrow">ADMIN / MY STUDENTS</p><h1>你好，{session.user.name}</h1><p>业务时间：Australia/Melbourne · 仅显示你负责的学生</p><button className="text" onClick={logout}>退出</button></header>
    <section className="numbers"><div><b>{adminData?.risks.length ?? 0}</b><span>需要处理的风险</span></div><div><b>{adminData?.students.length ?? 0}</b><span>我负责的学生</span></div><div><b>严格</b><span>学生数据隔离</span></div></section>
    <section className="risk"><div><p className="eyebrow">PRIORITY QUEUE</p><h2>今天先处理这些</h2>{loading ? <p>正在读取风险...</p> : adminData?.risks.length ? adminData.risks.map((risk) => <button className="riskrow" key={risk.studentId} onClick={() => void inspect(risk.studentId)}><b>{risk.studentName}</b><span>{risk.message}</span><em>查看学生</em></button>) : <p>目前没有余额风险。</p>}</div><div className="studentlist"><p className="eyebrow">MY STUDENTS · {adminData?.students.length ?? 0}</p>{adminData?.students.map((student) => <button key={student.id} onClick={() => void inspect(student.id)}>{student.name}<small>{student.creditBalance} credits</small></button>)}</div></section>
    {selected && <aside><button className="close" onClick={() => setSelected(null)}>x</button><p className="eyebrow">STUDENT FILE</p><h2>{selected.name}</h2><p>{selected.creditBalance} 节可用课时 · 你负责此学生</p><h3>已安排</h3>{selected.enrollments.length ? selected.enrollments.map((item) => <p key={item.id}>{item.title}</p>) : <p>尚未进入固定班。</p>}<h3>安排固定班</h3>{selected.availableClasses.map((room) => <button className="classpick" onClick={() => void enroll(room.id)} key={room.id}><b>{room.title}</b><span>周{room.dayOfWeek} · {formatTime(room.startMinute)}</span></button>)}{message && <p className="notice">{message}</p>}</aside>}
  </main>;
}

createRoot(document.getElementById('root')!).render(<App />);
