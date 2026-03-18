import { useState, useEffect } from 'react';
import api from '@/services/api';
import useConfirm from '@/hooks/useConfirm';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import './Education.css';

interface Grade { subject: string; score: number; fullScore?: number; examType?: string; date: string; }
interface Course { name: string; teacher?: string; schedule?: string; fee?: number; status: string; }
interface Student { _id: string; studentName: string; avatar?: string; school?: string; grade?: string; class?: string; courses: Course[]; grades: Grade[]; semester?: string; createdBy: { username: string }; }

const Education = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const { toast, hideToast, success, error } = useToast();

  const [formData, setFormData] = useState({ studentName: '', school: '', grade: '', class: '', semester: '' });
  const [gradeForm, setGradeForm] = useState({ subject: '', score: '', fullScore: '100', examType: 'quiz', date: new Date().toISOString().split('T')[0] });
  const [courseForm, setCourseForm] = useState({ name: '', teacher: '', schedule: '', fee: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [listRes, statsRes] = await Promise.all([api.get('/education'), api.get('/education/statistics')]);
      setStudents(Array.isArray(listRes.data) ? listRes.data : []);
      setStatistics(statsRes.data);
    } catch (err) { console.error('加载失败:', err); }
  };

  const handleSubmit = async () => {
    if (!formData.studentName) { error('请填写学生姓名'); return; }
    try {
      if (editingStudent) { await api.put(`/education/${editingStudent._id}`, formData); success('更新成功'); }
      else { await api.post('/education', formData); success('添加成功'); }
      setShowModal(false); loadData();
    } catch (err: any) { error(err.response?.data?.message || '操作失败'); }
  };

  const handleAddGrade = async () => {
    if (!selectedStudent || !gradeForm.subject || !gradeForm.score) { error('请填写科目和分数'); return; }
    try {
      await api.post(`/education/${selectedStudent._id}/grades`, { ...gradeForm, score: parseFloat(gradeForm.score), fullScore: parseFloat(gradeForm.fullScore) });
      success('成绩已添加');
      setShowGradeModal(false);
      const res = await api.get(`/education/${selectedStudent._id}`);
      setSelectedStudent(res.data);
      loadData();
    } catch (err: any) { error(err.response?.data?.message || '添加失败'); }
  };

  const handleAddCourse = async () => {
    if (!selectedStudent || !courseForm.name) { error('请填写课程名称'); return; }
    try {
      await api.post(`/education/${selectedStudent._id}/courses`, { ...courseForm, fee: courseForm.fee ? parseFloat(courseForm.fee) : undefined });
      success('课程已添加');
      setShowCourseModal(false);
      const res = await api.get(`/education/${selectedStudent._id}`);
      setSelectedStudent(res.data);
      loadData();
    } catch (err: any) { error(err.response?.data?.message || '添加失败'); }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({ title: '删除学生档案', message: '确定要删除吗？', confirmText: '删除', type: 'danger' });
    if (!confirmed) return;
    try { await api.delete(`/education/${id}`); success('已删除'); setShowDetailModal(false); loadData(); } catch (err: any) { error(err.response?.data?.message || '删除失败'); }
  };

  const openDetail = async (student: Student) => {
    try { const res = await api.get(`/education/${student._id}`); setSelectedStudent(res.data); setShowDetailModal(true); } catch { error('加载失败'); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('zh-CN');
  const getAverageScore = (grades: Grade[]) => {
    if (!grades.length) return 0;
    const total = grades.reduce((sum, g) => sum + (g.fullScore ? (g.score / g.fullScore) * 100 : g.score), 0);
    return Math.round(total / grades.length);
  };

  return (
    <div className="education-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      <div className="page-header">
        <div><h1 className="page-title">📚 教育管理</h1><p className="page-subtitle">记录学习成长，陪伴孩子进步</p></div>
        <button className="btn-primary" onClick={() => { setEditingStudent(null); setFormData({ studentName: '', school: '', grade: '', class: '', semester: '' }); setShowModal(true); }}>+ 添加学生</button>
      </div>

      {statistics && (
        <div className="stats-row">
          <div className="stat-card"><span className="stat-icon">👨‍🎓</span><div className="stat-info"><span className="stat-value">{statistics.totalStudents}</span><span className="stat-label">学生</span></div></div>
          <div className="stat-card"><span className="stat-icon">📖</span><div className="stat-info"><span className="stat-value">{statistics.totalCourses}</span><span className="stat-label">课程</span></div></div>
          <div className="stat-card"><span className="stat-icon">📝</span><div className="stat-info"><span className="stat-value">{statistics.totalGrades}</span><span className="stat-label">成绩记录</span></div></div>
          <div className="stat-card"><span className="stat-icon">📊</span><div className="stat-info"><span className="stat-value">{statistics.averageScore}分</span><span className="stat-label">平均成绩</span></div></div>
        </div>
      )}

      <div className="students-grid">
        {students.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📚</div><p>还没有添加学生</p></div>
        ) : (
          students.map(student => (
            <div key={student._id} className="student-card" onClick={() => openDetail(student)}>
              <div className="student-avatar">{student.avatar ? <img src={student.avatar} alt="" /> : <span>👨‍🎓</span>}</div>
              <div className="student-info">
                <h3>{student.studentName}</h3>
                <p>{student.school} {student.grade && `· ${student.grade}`}</p>
                <div className="student-stats">
                  <span>📖 {student.courses?.length || 0} 课程</span>
                  <span>📝 {student.grades?.length || 0} 成绩</span>
                  <span>📊 {getAverageScore(student.grades || [])}分</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editingStudent ? '编辑学生' : '添加学生'}</h2>
            <div className="form-group"><label>姓名 *</label><input type="text" value={formData.studentName} onChange={e => setFormData({ ...formData, studentName: e.target.value })} /></div>
            <div className="form-row">
              <div className="form-group"><label>学校</label><input type="text" value={formData.school} onChange={e => setFormData({ ...formData, school: e.target.value })} /></div>
              <div className="form-group"><label>年级</label><input type="text" value={formData.grade} onChange={e => setFormData({ ...formData, grade: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>班级</label><input type="text" value={formData.class} onChange={e => setFormData({ ...formData, class: e.target.value })} /></div>
              <div className="form-group"><label>学期</label><input type="text" value={formData.semester} onChange={e => setFormData({ ...formData, semester: e.target.value })} placeholder="如：2024春季" /></div>
            </div>
            <div className="modal-actions"><button type="button" onClick={() => setShowModal(false)}>取消</button><button type="submit" onClick={handleSubmit}>{editingStudent ? '保存' : '添加'}</button></div>
          </div>
        </div>
      )}

      {showDetailModal && selectedStudent && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content modal-detail" onClick={e => e.stopPropagation()}>
            <div className="detail-header"><span className="detail-icon">👨‍🎓</span><div className="detail-title"><h2>{selectedStudent.studentName}</h2><p>{selectedStudent.school} {selectedStudent.grade}</p></div></div>
            <div className="detail-body">
              <div className="section">
                <div className="section-header"><h4>📝 成绩记录</h4><button className="btn-add" onClick={() => { setGradeForm({ subject: '', score: '', fullScore: '100', examType: 'quiz', date: new Date().toISOString().split('T')[0] }); setShowGradeModal(true); }}>+ 添加</button></div>
                {selectedStudent.grades?.length === 0 ? <p className="empty-text">暂无成绩</p> : (
                  <div className="grades-list">{selectedStudent.grades?.slice(-10).reverse().map((g, i) => (
                    <div key={i} className="grade-item"><span className="subject">{g.subject}</span><span className="score">{g.score}{g.fullScore && `/${g.fullScore}`}</span><span className="date">{formatDate(g.date)}</span></div>
                  ))}</div>
                )}
              </div>
              <div className="section">
                <div className="section-header"><h4>📖 课程</h4><button className="btn-add" onClick={() => { setCourseForm({ name: '', teacher: '', schedule: '', fee: '' }); setShowCourseModal(true); }}>+ 添加</button></div>
                {selectedStudent.courses?.length === 0 ? <p className="empty-text">暂无课程</p> : (
                  <div className="courses-list">{selectedStudent.courses?.map((c, i) => (
                    <div key={i} className="course-item"><span className="course-name">{c.name}</span>{c.teacher && <span className="teacher">👨‍🏫 {c.teacher}</span>}{c.schedule && <span className="schedule">{c.schedule}</span>}</div>
                  ))}</div>
                )}
              </div>
            </div>
            <div className="detail-footer"><button className="btn-delete" onClick={() => handleDelete(selectedStudent._id)}>🗑️ 删除</button><button onClick={() => setShowDetailModal(false)}>关闭</button></div>
          </div>
        </div>
      )}

      {showGradeModal && (
        <div className="modal-overlay" onClick={() => setShowGradeModal(false)}>
          <div className="modal-content modal-small" onClick={e => e.stopPropagation()}>
            <h2>添加成绩</h2>
            <div className="form-group"><label>科目 *</label><input type="text" value={gradeForm.subject} onChange={e => setGradeForm({ ...gradeForm, subject: e.target.value })} placeholder="如：数学" /></div>
            <div className="form-row">
              <div className="form-group"><label>分数 *</label><input type="number" value={gradeForm.score} onChange={e => setGradeForm({ ...gradeForm, score: e.target.value })} /></div>
              <div className="form-group"><label>满分</label><input type="number" value={gradeForm.fullScore} onChange={e => setGradeForm({ ...gradeForm, fullScore: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>类型</label><select value={gradeForm.examType} onChange={e => setGradeForm({ ...gradeForm, examType: e.target.value })}><option value="quiz">测验</option><option value="midterm">期中</option><option value="final">期末</option><option value="homework">作业</option></select></div>
              <div className="form-group"><label>日期</label><input type="date" value={gradeForm.date} onChange={e => setGradeForm({ ...gradeForm, date: e.target.value })} /></div>
            </div>
            <div className="modal-actions"><button type="button" onClick={() => setShowGradeModal(false)}>取消</button><button type="submit" onClick={handleAddGrade}>添加</button></div>
          </div>
        </div>
      )}

      {showCourseModal && (
        <div className="modal-overlay" onClick={() => setShowCourseModal(false)}>
          <div className="modal-content modal-small" onClick={e => e.stopPropagation()}>
            <h2>添加课程</h2>
            <div className="form-group"><label>课程名称 *</label><input type="text" value={courseForm.name} onChange={e => setCourseForm({ ...courseForm, name: e.target.value })} /></div>
            <div className="form-row">
              <div className="form-group"><label>老师</label><input type="text" value={courseForm.teacher} onChange={e => setCourseForm({ ...courseForm, teacher: e.target.value })} /></div>
              <div className="form-group"><label>费用</label><input type="number" value={courseForm.fee} onChange={e => setCourseForm({ ...courseForm, fee: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>上课时间</label><input type="text" value={courseForm.schedule} onChange={e => setCourseForm({ ...courseForm, schedule: e.target.value })} placeholder="如：周六 10:00-11:30" /></div>
            <div className="modal-actions"><button type="button" onClick={() => setShowCourseModal(false)}>取消</button><button type="submit" onClick={handleAddCourse}>添加</button></div>
          </div>
        </div>
      )}

      {ConfirmDialogComponent}
    </div>
  );
};

export default Education;






