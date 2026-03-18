import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  Handle,
  Position,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import api from '@/services/api';
import useConfirm from '@/hooks/useConfirm';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import './FamilyTree.css';

interface Member {
  _id: string;
  name: string;
  avatar?: string;
  gender?: string;
  birthday?: string;
  deathDate?: string;
  birthplace?: string;
  currentLocation?: string;
  phone?: string;
  occupation?: string;
  bio?: string;
  fatherId?: { _id: string; name: string } | string;
  motherId?: { _id: string; name: string } | string;
  spouseId?: { _id: string; name: string } | string;
  generation?: number;
  isAlive: boolean;
}

// 自定义节点数据类型
interface MemberNodeData {
  member: Member;
  onDetail: (member: Member) => void;
  onAddChild: (parentId: string) => void;
  onAddSpouse: (memberId: string) => void;
  calculateAge: (birthday: string, deathDate?: string) => number;
}

// 自定义成员节点组件
const MemberNode = ({ data }: { data: MemberNodeData }) => {
  const { member, onDetail, onAddChild, onAddSpouse, calculateAge } = data;
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={`flow-member-node ${member.gender === 'female' ? 'female' : 'male'} ${!member.isAlive ? 'deceased' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* 顶部连接点 - 连接到父母 */}
      <Handle type="target" position={Position.Top} id="top" className="handle-top" />
      
      {/* 左右连接点 - 配偶连接 */}
      <Handle type="source" position={Position.Left} id="spouse-left" className="handle-spouse" />
      <Handle type="target" position={Position.Right} id="spouse-right" className="handle-spouse" />
      
      <div className="node-content" onClick={() => onDetail(member)}>
        <div className="node-avatar">
          {member.avatar ? (
            <img src={member.avatar} alt="" />
          ) : (
            <span>{member.gender === 'female' ? '👩' : '👨'}</span>
          )}
        </div>
        <div className="node-name">{member.name}</div>
        {member.birthday && (
          <div className="node-age">{calculateAge(member.birthday, member.deathDate)}岁</div>
        )}
        {!member.isAlive && <div className="node-deceased">已故</div>}
      </div>

      {/* 操作按钮 */}
      {showActions && (
        <div className="node-actions">
          <button
            className="action-btn add-child"
            onClick={(e) => { e.stopPropagation(); onAddChild(member._id); }}
            title="添加子女"
          >
            👶+
          </button>
          <button
            className="action-btn add-spouse"
            onClick={(e) => { e.stopPropagation(); onAddSpouse(member._id); }}
            title="添加配偶"
          >
            💕+
          </button>
        </div>
      )}

      {/* 底部连接点 - 连接到子女 */}
      <Handle type="source" position={Position.Bottom} id="bottom" className="handle-bottom" />
    </div>
  );
};

// 自定义节点类型
const nodeTypes: NodeTypes = {
  memberNode: MemberNode,
};

const FamilyTree = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const { toast, hideToast, success, error } = useToast();

  // 预设的父母/配偶ID（从节点操作触发）
  const [presetParentId, setPresetParentId] = useState<string>('');
  const [presetSpouseId, setPresetSpouseId] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '', gender: 'male', birthday: '', birthplace: '', currentLocation: '', phone: '', occupation: '', bio: '', fatherId: '', motherId: '', spouseId: '', generation: '', isAlive: true,
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [listRes, statsRes] = await Promise.all([api.get('/family-tree'), api.get('/family-tree/statistics')]);
      setMembers(Array.isArray(listRes.data) ? listRes.data : []);
      setStatistics(statsRes.data);
    } catch (err) { console.error('加载失败:', err); }
  };

  const handleSubmit = async () => {
    if (!formData.name) { error('请填写姓名'); return; }
    try {
      const data = { ...formData, generation: formData.generation ? parseInt(formData.generation) : undefined };
      if (editingMember) { await api.put(`/family-tree/${editingMember._id}`, data); success('更新成功'); }
      else { await api.post('/family-tree', data); success('添加成功'); }
      setShowModal(false);
      setPresetParentId('');
      setPresetSpouseId('');
      loadData();
    } catch (err: any) { error(err.response?.data?.message || '操作失败'); }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({ title: '删除成员', message: '确定要删除此成员吗？', confirmText: '删除', type: 'danger' });
    if (!confirmed) return;
    try { await api.delete(`/family-tree/${id}`); success('已删除'); setShowDetailModal(false); loadData(); } catch (err: any) { error(err.response?.data?.message || '删除失败'); }
  };

  const openDetail = async (member: Member) => {
    try { const res = await api.get(`/family-tree/${member._id}`); setSelectedMember(res.data); setShowDetailModal(true); } catch { error('加载失败'); }
  };

  const openEdit = () => {
    if (!selectedMember) return;
    setEditingMember(selectedMember);
    setFormData({
      name: selectedMember.name, gender: selectedMember.gender || 'male',
      birthday: selectedMember.birthday ? new Date(selectedMember.birthday).toISOString().split('T')[0] : '',
      birthplace: selectedMember.birthplace || '', currentLocation: selectedMember.currentLocation || '',
      phone: selectedMember.phone || '', occupation: selectedMember.occupation || '', bio: selectedMember.bio || '',
      fatherId: typeof selectedMember.fatherId === 'object' ? selectedMember.fatherId?._id : selectedMember.fatherId || '',
      motherId: typeof selectedMember.motherId === 'object' ? selectedMember.motherId?._id : selectedMember.motherId || '',
      spouseId: typeof selectedMember.spouseId === 'object' ? selectedMember.spouseId?._id : selectedMember.spouseId || '',
      generation: selectedMember.generation?.toString() || '', isAlive: selectedMember.isAlive,
    });
    setShowDetailModal(false);
    setShowModal(true);
  };

  // 从节点添加子女
  const handleAddChild = (parentId: string) => {
    const parent = members.find(m => m._id === parentId);
    if (!parent) return;

    setEditingMember(null);
    setPresetParentId(parentId);
    setPresetSpouseId('');
    
    // 根据父母性别设置
    const parentGender = parent.gender;
    const spouseId = getMemberId(parent.spouseId);
    
    setFormData({
      name: '', gender: 'male', birthday: '', birthplace: '', currentLocation: '', phone: '', occupation: '', bio: '',
      fatherId: parentGender === 'male' ? parentId : (spouseId || ''),
      motherId: parentGender === 'female' ? parentId : (spouseId || ''),
      spouseId: '',
      generation: parent.generation ? (parent.generation + 1).toString() : '',
      isAlive: true,
    });
    setShowModal(true);
  };

  // 从节点添加配偶
  const handleAddSpouse = (memberId: string) => {
    const member = members.find(m => m._id === memberId);
    if (!member) return;

    setEditingMember(null);
    setPresetParentId('');
    setPresetSpouseId(memberId);
    
    setFormData({
      name: '', gender: member.gender === 'male' ? 'female' : 'male', birthday: '', birthplace: '', currentLocation: '', phone: '', occupation: '', bio: '',
      fatherId: '', motherId: '',
      spouseId: memberId,
      generation: member.generation?.toString() || '',
      isAlive: true,
    });
    setShowModal(true);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('zh-CN');
  const calculateAge = (birthday: string, deathDate?: string) => {
    const end = deathDate ? new Date(deathDate) : new Date();
    const birth = new Date(birthday);
    return Math.floor((end.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  };
  const getRelationName = (id: string | { _id: string; name: string } | undefined) => {
    if (!id) return null;
    if (typeof id === 'object') return id.name;
    const m = members.find(m => m._id === id);
    return m?.name || null;
  };

  const getMemberId = (ref: { _id: string } | string | undefined): string | null => {
    if (!ref) return null;
    if (typeof ref === 'object') return ref._id;
    return ref;
  };

  // 构建 React Flow 节点和边
  useEffect(() => {
    if (members.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const nodeMap = new Map<string, { x: number; y: number }>();
    const generationMap = new Map<number, Member[]>();
    const processedSpouses = new Set<string>();

    // 按辈分分组
    members.forEach(m => {
      const gen = m.generation || 0;
      if (!generationMap.has(gen)) generationMap.set(gen, []);
      generationMap.get(gen)!.push(m);
    });

    // 排序辈分
    const generations = Array.from(generationMap.keys()).sort((a, b) => a - b);

    // 计算节点位置
    const nodeWidth = 140;
    const nodeHeight = 120;
    const horizontalGap = 60;
    const verticalGap = 150;
    const spouseGap = 30;

    let currentY = 50;

    generations.forEach(gen => {
      const genMembers = generationMap.get(gen)!;
      let currentX = 50;

      // 先处理有配偶关系的成员，放在一起
      const processed = new Set<string>();

      genMembers.forEach(m => {
        if (processed.has(m._id)) return;
        processed.add(m._id);

        nodeMap.set(m._id, { x: currentX, y: currentY });
        currentX += nodeWidth;

        // 检查配偶
        const spouseId = getMemberId(m.spouseId);
        if (spouseId) {
          const spouse = members.find(s => s._id === spouseId);
          if (spouse && spouse.generation === gen && !processed.has(spouseId)) {
            currentX += spouseGap; // 配偶间距更小
            nodeMap.set(spouseId, { x: currentX, y: currentY });
            processed.add(spouseId);
            processedSpouses.add(`${m._id}-${spouseId}`);
            currentX += nodeWidth;
          }
        }

        currentX += horizontalGap;
      });

      currentY += verticalGap + nodeHeight;
    });

    // 创建节点
    const newNodes: Node[] = members.map(m => {
      const pos = nodeMap.get(m._id) || { x: 0, y: 0 };
      return {
        id: m._id,
        type: 'memberNode',
        position: pos,
        data: {
          member: m,
          onDetail: openDetail,
          onAddChild: handleAddChild,
          onAddSpouse: handleAddSpouse,
          calculateAge,
        },
        draggable: true,
      };
    });

    // 创建边（连线）
    const newEdges: Edge[] = [];

    members.forEach(m => {
      // 父亲连线
      const fatherId = getMemberId(m.fatherId);
      if (fatherId && members.some(p => p._id === fatherId)) {
        newEdges.push({
          id: `father-${fatherId}-${m._id}`,
          source: fatherId,
          target: m._id,
          sourceHandle: 'bottom',
          targetHandle: 'top',
          type: 'smoothstep',
          style: { stroke: '#2196f3', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#2196f3', width: 15, height: 15 },
          label: '父',
          labelStyle: { fontSize: 10, fill: '#2196f3' },
          labelBgStyle: { fill: 'white' },
        });
      }

      // 母亲连线
      const motherId = getMemberId(m.motherId);
      if (motherId && members.some(p => p._id === motherId)) {
        newEdges.push({
          id: `mother-${motherId}-${m._id}`,
          source: motherId,
          target: m._id,
          sourceHandle: 'bottom',
          targetHandle: 'top',
          type: 'smoothstep',
          style: { stroke: '#e91e63', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#e91e63', width: 15, height: 15 },
          label: '母',
          labelStyle: { fontSize: 10, fill: '#e91e63' },
          labelBgStyle: { fill: 'white' },
        });
      }

      // 配偶连线（只添加一次）
      const spouseId = getMemberId(m.spouseId);
      if (spouseId && members.some(s => s._id === spouseId)) {
        const edgeKey1 = `${m._id}-${spouseId}`;
        const edgeKey2 = `${spouseId}-${m._id}`;
        const existingSpouseEdge = newEdges.some(e => 
          e.id === `spouse-${edgeKey1}` || e.id === `spouse-${edgeKey2}`
        );
        
        if (!existingSpouseEdge) {
          newEdges.push({
            id: `spouse-${edgeKey1}`,
            source: m._id,
            target: spouseId,
            sourceHandle: 'spouse-left',
            targetHandle: 'spouse-right',
            type: 'straight',
            style: { stroke: '#ff4081', strokeWidth: 2, strokeDasharray: '5,5' },
            label: '💕',
            labelStyle: { fontSize: 14 },
          });
        }
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [members]);

  // 拖拽连线创建关系
  const onConnect = useCallback(async (connection: Connection) => {
    if (!connection.source || !connection.target) return;

    const sourceMember = members.find(m => m._id === connection.source);
    const targetMember = members.find(m => m._id === connection.target);
    
    if (!sourceMember || !targetMember) return;

    // 根据连接点判断关系类型
    const sourceHandle = connection.sourceHandle;
    const targetHandle = connection.targetHandle;

    try {
      if (sourceHandle === 'bottom' && targetHandle === 'top') {
        // 父子关系：source 是父母，target 是子女
        const updateData = sourceMember.gender === 'male' 
          ? { fatherId: sourceMember._id }
          : { motherId: sourceMember._id };
        
        await api.put(`/family-tree/${targetMember._id}`, updateData);
        success('已建立父子关系');
      } else if (sourceHandle?.includes('spouse') || targetHandle?.includes('spouse')) {
        // 配偶关系
        await api.put(`/family-tree/${sourceMember._id}`, { spouseId: targetMember._id });
        await api.put(`/family-tree/${targetMember._id}`, { spouseId: sourceMember._id });
        success('已建立配偶关系');
      }
      
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '建立关系失败');
    }
  }, [members, success, error]);

  // 节点拖拽结束后保存位置（可选）
  const onNodeDragStop = useCallback((event: any, node: Node) => {
    // 这里可以保存节点位置到后端
    console.log('Node dragged:', node.id, node.position);
  }, []);

  return (
    <div className="family-tree-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      <div className="page-header">
        <div>
          <h1 className="page-title">🌳 家族树</h1>
          <p className="page-subtitle">拖拽节点移动位置，拖拽连接点建立关系</p>
        </div>
        <button className="btn-primary" onClick={() => {
          setEditingMember(null);
          setPresetParentId('');
          setPresetSpouseId('');
          setFormData({ name: '', gender: 'male', birthday: '', birthplace: '', currentLocation: '', phone: '', occupation: '', bio: '', fatherId: '', motherId: '', spouseId: '', generation: '', isAlive: true });
          setShowModal(true);
        }}>+ 添加成员</button>
      </div>

      {statistics && (
        <div className="stats-row">
          <div className="stat-card"><span className="stat-icon">👥</span><div className="stat-info"><span className="stat-value">{statistics.totalMembers}</span><span className="stat-label">家族成员</span></div></div>
          <div className="stat-card"><span className="stat-icon">📊</span><div className="stat-info"><span className="stat-value">{statistics.generationCount}</span><span className="stat-label">辈分</span></div></div>
          <div className="stat-card"><span className="stat-icon">👨</span><div className="stat-info"><span className="stat-value">{statistics.maleCount}</span><span className="stat-label">男性</span></div></div>
          <div className="stat-card"><span className="stat-icon">👩</span><div className="stat-info"><span className="stat-value">{statistics.femaleCount}</span><span className="stat-label">女性</span></div></div>
        </div>
      )}

      <div className="tree-container flow-container" ref={reactFlowWrapper}>
        {members.length > 0 ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.3}
            maxZoom={2}
            defaultEdgeOptions={{
              type: 'smoothstep',
            }}
          >
            <Controls showInteractive={false} />
            <MiniMap 
              nodeColor={(node) => {
                const member = node.data?.member;
                if (!member) return '#ccc';
                return member.gender === 'female' ? '#fce4ec' : '#e3f2fd';
              }}
              maskColor="rgba(0,0,0,0.1)"
            />
            <Background color="#ddd" gap={20} />
          </ReactFlow>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🌳</div>
            <p>还没有添加家族成员</p>
            <p className="empty-hint">点击"添加成员"开始构建家族树</p>
          </div>
        )}
      </div>

      <div className="flow-legend">
        <div className="legend-item">
          <span className="legend-line father-line"></span>
          <span>父子关系</span>
        </div>
        <div className="legend-item">
          <span className="legend-line mother-line"></span>
          <span>母子关系</span>
        </div>
        <div className="legend-item">
          <span className="legend-line spouse-line"></span>
          <span>配偶关系</span>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editingMember ? '编辑成员' : presetParentId ? '添加子女' : presetSpouseId ? '添加配偶' : '添加成员'}</h2>
            <div className="form-row">
              <div className="form-group"><label>姓名 *</label><input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
              <div className="form-group"><label>性别</label><select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}><option value="male">男</option><option value="female">女</option></select></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>出生日期</label><input type="date" value={formData.birthday} onChange={e => setFormData({ ...formData, birthday: e.target.value })} /></div>
              <div className="form-group"><label>辈分（代）</label><input type="number" value={formData.generation} onChange={e => setFormData({ ...formData, generation: e.target.value })} placeholder="如：3" /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>父亲</label><select value={formData.fatherId} onChange={e => setFormData({ ...formData, fatherId: e.target.value })}><option value="">选择...</option>{members.filter(m => m.gender === 'male').map(m => <option key={m._id} value={m._id}>{m.name}</option>)}</select></div>
              <div className="form-group"><label>母亲</label><select value={formData.motherId} onChange={e => setFormData({ ...formData, motherId: e.target.value })}><option value="">选择...</option>{members.filter(m => m.gender === 'female').map(m => <option key={m._id} value={m._id}>{m.name}</option>)}</select></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>配偶</label><select value={formData.spouseId} onChange={e => setFormData({ ...formData, spouseId: e.target.value })}><option value="">选择...</option>{members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}</select></div>
              <div className="form-group"><label>状态</label><select value={formData.isAlive ? 'alive' : 'deceased'} onChange={e => setFormData({ ...formData, isAlive: e.target.value === 'alive' })}><option value="alive">在世</option><option value="deceased">已故</option></select></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>出生地</label><input type="text" value={formData.birthplace} onChange={e => setFormData({ ...formData, birthplace: e.target.value })} /></div>
              <div className="form-group"><label>现居地</label><input type="text" value={formData.currentLocation} onChange={e => setFormData({ ...formData, currentLocation: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>电话</label><input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
              <div className="form-group"><label>职业</label><input type="text" value={formData.occupation} onChange={e => setFormData({ ...formData, occupation: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>简介</label><textarea value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} rows={2} /></div>
            <div className="modal-actions"><button type="button" onClick={() => setShowModal(false)}>取消</button><button type="submit" onClick={handleSubmit}>{editingMember ? '保存' : '添加'}</button></div>
          </div>
        </div>
      )}

      {showDetailModal && selectedMember && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content modal-detail" onClick={e => e.stopPropagation()}>
            <div className="detail-header" style={{ background: selectedMember.gender === 'female' ? 'linear-gradient(135deg, #e91e63 0%, #c2185b 100%)' : 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)' }}>
              <div className="detail-avatar">{selectedMember.avatar ? <img src={selectedMember.avatar} alt="" /> : <span>{selectedMember.gender === 'female' ? '👩' : '👨'}</span>}</div>
              <div className="detail-title"><h2>{selectedMember.name}</h2>{selectedMember.birthday && <p>{calculateAge(selectedMember.birthday, selectedMember.deathDate)}岁 · 第{selectedMember.generation || '?'}代</p>}</div>
            </div>
            <div className="detail-body">
              <div className="info-grid">
                {selectedMember.birthday && <div className="info-item"><label>出生日期</label><span>{formatDate(selectedMember.birthday)}</span></div>}
                {selectedMember.birthplace && <div className="info-item"><label>出生地</label><span>{selectedMember.birthplace}</span></div>}
                {selectedMember.currentLocation && <div className="info-item"><label>现居地</label><span>{selectedMember.currentLocation}</span></div>}
                {selectedMember.occupation && <div className="info-item"><label>职业</label><span>{selectedMember.occupation}</span></div>}
                {selectedMember.phone && <div className="info-item"><label>电话</label><span>{selectedMember.phone}</span></div>}
              </div>
              <div className="relations-section">
                <h4>👨‍👩‍👧‍👦 家庭关系</h4>
                <div className="relations-list">
                  {getRelationName(selectedMember.fatherId) && <div className="relation-item"><span className="relation-type">父亲</span><span className="relation-name">{getRelationName(selectedMember.fatherId)}</span></div>}
                  {getRelationName(selectedMember.motherId) && <div className="relation-item"><span className="relation-type">母亲</span><span className="relation-name">{getRelationName(selectedMember.motherId)}</span></div>}
                  {getRelationName(selectedMember.spouseId) && <div className="relation-item"><span className="relation-type">配偶</span><span className="relation-name">{getRelationName(selectedMember.spouseId)}</span></div>}
                </div>
              </div>
              {selectedMember.bio && <div className="bio-section"><h4>📝 简介</h4><p>{selectedMember.bio}</p></div>}
            </div>
            <div className="detail-footer"><button className="btn-delete" onClick={() => handleDelete(selectedMember._id)}>🗑️ 删除</button><button className="btn-edit" onClick={openEdit}>✏️ 编辑</button><button onClick={() => setShowDetailModal(false)}>关闭</button></div>
          </div>
        </div>
      )}

      {ConfirmDialogComponent}
    </div>
  );
};

export default FamilyTree;
